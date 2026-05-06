export const dynamic = "force-dynamic";

console.log("FULL ENV:", process.env);

import OpenAI from "openai";
import { NextResponse } from "next/server";

type Tone = "polite" | "firm" | "final";

function isTone(value: unknown): value is Tone {
  return value === "polite" || value === "firm" || value === "final";
}

function asPositiveInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const intVal = Math.trunc(value);
  if (intVal < 0) return null;
  return intVal;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed;
}

function toneGuidance(tone: Tone) {
  switch (tone) {
    case "polite":
      return "Warm, courteous, and assumption of good intent. Gentle reminder.";
    case "firm":
      return "Direct and professional. Clear ask, clear next step, but not harsh.";
    case "final":
      return "Very clear and urgent, but still professional and non-threatening. Mention this is a final reminder and ask for confirmation/payment date.";
  }
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    const body = (await req.json().catch(() => null)) as unknown;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { amount, daysOverdue, tone } = body as {
      amount?: unknown;
      invoiceNumber?: unknown;
      daysOverdue?: unknown;
      tone?: unknown;
    };

    const parsedAmount = asNonEmptyString(amount);
    const parsedInvoiceNumber = asNonEmptyString((body as any)?.invoiceNumber);
    const parsedDaysOverdue = asPositiveInteger(daysOverdue);
    const parsedTone = isTone(tone) ? tone : null;

    if (!parsedAmount || parsedDaysOverdue === null || !parsedTone) {
      return NextResponse.json(
        {
          error:
            'Body must be { amount: string, daysOverdue: number, tone: "polite" | "firm" | "final", invoiceNumber?: string }',
        },
        { status: 400 }
      );
    }

    const client = new OpenAI({ apiKey });

    const days = parsedDaysOverdue;
    const recommendedTone: Tone = days >= 30 ? "final" : days >= 14 ? "firm" : "polite";

    const prompt = [
      "Return ONLY valid JSON with keys: subject, body.",
      "",
      "Write an overdue invoice email that sounds like a real business owner chasing payment (human, direct, no corporate tone).",
      "Keep the BODY to a maximum of 3–4 sentences.",
      "",
      "Hard requirements:",
      parsedInvoiceNumber
        ? `- Subject MUST be exactly: "Invoice ${parsedInvoiceNumber} – ${parsedAmount} – ${days} days overdue".`
        : `- Subject MUST be exactly: "${parsedAmount} invoice – ${days} days overdue".`,
      "- Body MUST be a maximum of 3 sentences for polite and firm tones.",
      `- Body MUST explicitly include the invoice amount (${parsedAmount}).`,
      "- No corporate jargon. Sound like a real person running a business who wrote this quickly.",
      "- Keep sentences short and plain. Avoid long or complex sentence structures.",
      "- Prefer simple questions over formal phrasing (e.g., \"Can you pay today?\" / \"When can you pay?\" / \"Can you confirm a payment date?\").",
      "- Slightly informal but still professional. Should feel typed in ~10 seconds, not carefully composed.",
      "- Do NOT use any of these phrases (or close variants): \"touch base\", \"I hope you're well\", \"I would appreciate it\", \"thanks\", \"thank you\", \"kindly\".",
      "- Avoid generic/template phrases like: \"reminder\", \"per our records\", \"at your earliest convenience\".",
      "",
      "Style rules:",
      "- Short, clear subject line (no emojis, no excessive punctuation).",
      "- No unnecessary greetings or pleasantries.",
      "- Calm, confident, and specific. No threats or legal-sounding language.",
      "",
      "Structure (3–4 sentences total):",
      "1) State the invoice (include invoice number if provided), the amount, and that it's overdue by X days.",
      "2) Make the ask (varies by tone) and request a specific next step.",
      "3) Optional: one short line acknowledging it may already be paid and to reply with confirmation.",
      "",
      "Tone differentiation (use the requested tone, but keep it realistic for the days overdue):",
      "- polite: start with a short natural opener like \"Just checking in\" (no greeting); assume the delay is unintentional; ask for a payment update or expected payment date; direct but non-confrontational; do NOT push immediate payment aggressively.",
      "- firm: do NOT use words/phrases like \"reminder\", \"just checking\", or \"touch base\". Start with a direct statement like \"Invoice <number> is now overdue\" (or \"This invoice is now overdue\" if no number). Set a clear expectation (\"Please arrange payment\") and add urgency (\"today\" / \"as soon as possible\"). Include a fallback: \"If there’s an issue, let me know.\" Tone: direct, controlled, professional.",
      "- final: MUST be exactly 4 sentences, in this exact structure and wording (do not omit, reorder, or soften):",
      "- final formatting: each sentence MUST be on its own line (separate paragraph). Use line breaks between sentences.",
      `  1) State invoice number${parsedInvoiceNumber ? "" : " (if provided)"} , amount, and how overdue it is.`,
      "  2) \"Please arrange immediate payment.\"",
      "  3) \"If this remains unpaid, we will need to consider next steps.\"",
      "  4) \"Confirm once payment has been made.\"",
      "- final: Do NOT offer flexibility like \"confirm a payment date\" or \"let me know when you can pay\". Tone: controlled, serious, professional (not emotional, not aggressive).",
      "",
      `Invoice amount: ${parsedAmount}`,
      parsedInvoiceNumber ? `Invoice number: ${parsedInvoiceNumber}` : "Invoice number: (not provided)",
      `Days overdue: ${days}`,
      `Requested tone: ${parsedTone} (${toneGuidance(parsedTone)})`,
      `Tone guidance based on days overdue: recommended ${recommendedTone}. If requested tone conflicts with days overdue, blend appropriately while staying calm and non-threatening.`,
    ].join("\n");

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "You write short, realistic overdue invoice emails in a human business-owner voice. Sentences are short and plain, with simple questions. Slightly informal but professional. No template filler, no softening language, no corporate jargon. Body length: polite/firm max 3 sentences; final must be exactly 4 sentences as specified. No threats or legal-ese. Output must be strict JSON only.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content ?? "";
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = null;
    }

    const subject = asNonEmptyString((parsed as any)?.subject);
    const emailBody = asNonEmptyString((parsed as any)?.body);

    if (!subject || !emailBody) {
      return NextResponse.json(
        { error: "Model response was not in the expected shape." },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { subject, body: emailBody },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    console.error("OPENAI ERROR:", err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}

