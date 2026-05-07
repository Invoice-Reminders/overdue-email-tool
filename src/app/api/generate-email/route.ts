export const dynamic = "force-dynamic";

console.log("FULL ENV:", process.env);

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
    const requestBody = (await req.json().catch(() => null)) as unknown;
    if (!requestBody || typeof requestBody !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { amount, daysOverdue, tone } = requestBody as {
      amount?: unknown;
      invoiceNumber?: unknown;
      recipientName?: unknown;
      senderName?: unknown;
      daysOverdue?: unknown;
      tone?: unknown;
    };

    const parsedAmount = asNonEmptyString(amount);
    const parsedInvoiceNumber = asNonEmptyString((requestBody as any)?.invoiceNumber);
    const parsedRecipientName = asNonEmptyString((requestBody as any)?.recipientName);
    const parsedSenderName = asNonEmptyString((requestBody as any)?.senderName);
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

    const days = parsedDaysOverdue;
    const stage: Tone = days >= 22 ? "final" : days >= 8 ? "firm" : "polite";

    const amountForParen = parsedAmount.includes("£") ? parsedAmount : `£${parsedAmount}`;

    const subject = parsedInvoiceNumber
      ? stage === "polite"
        ? `Invoice ${parsedInvoiceNumber} (${amountForParen}) is now overdue`
        : stage === "firm"
          ? `Invoice ${parsedInvoiceNumber} (${amountForParen}) is still outstanding`
          : `Invoice ${parsedInvoiceNumber} (${amountForParen}) requires immediate attention`
      : `${parsedAmount} invoice – ${days} days overdue`;

    const line1 = parsedInvoiceNumber
      ? stage === "polite"
        ? `Just a quick note regarding invoice ${parsedInvoiceNumber} (${amountForParen}), which is now ${days} days overdue.`
        : stage === "firm"
          ? `I wanted to follow up on invoice ${parsedInvoiceNumber} (${amountForParen}), which is now ${days} days overdue.`
          : `I’m following up again regarding invoice ${parsedInvoiceNumber} (${amountForParen}), now ${days} days overdue.`
      : `This invoice (${amountForParen}) is now ${days} days overdue.`;

    const emailBody =
      stage === "polite"
        ? [
            line1,
            "Please arrange payment when possible.",
            "If you've already sent this, just let me know.",
          ].join(" ")
        : stage === "firm"
          ? [
              line1,
              "Please arrange payment as soon as possible.",
              "If there’s an issue on your side, let me know.",
            ].join(" ")
          : [line1, "Please arrange immediate payment.", "If this remains unpaid, we will need to consider next steps.", "Confirm once payment has been made."].join("\n\n");

    const greeting = parsedRecipientName ? `Hi ${parsedRecipientName},` : "Hi,";
    const signoff = stage === "final" ? "Regards," : "Thanks,";
    const formattedBody = [
      greeting,
      "",
      emailBody,
      "",
      signoff,
      ...(parsedSenderName ? [parsedSenderName] : []),
    ].join("\n");

    return NextResponse.json(
      { subject, body: formattedBody },
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

