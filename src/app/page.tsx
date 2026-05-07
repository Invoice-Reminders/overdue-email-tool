"use client";

import { useMemo, useState } from "react";

type Tone = "polite" | "firm" | "final";

type ApiResult =
  | { ok: true; subject: string; body: string }
  | { ok: false; error: string };

export default function Page() {
  const [amount, setAmount] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [recipientEmail, setRecipientEmail] = useState<string>("");
  const [recipientName, setRecipientName] = useState<string>("");
  const [senderName, setSenderName] = useState<string>("");
  const [daysOverdue, setDaysOverdue] = useState<number>(7);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ subject: string; body: string } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canGenerate = useMemo(() => {
    return amount.trim().length > 0 && Number.isFinite(daysOverdue) && daysOverdue >= 0;
  }, [amount, daysOverdue]);

  const tone = useMemo<Tone>(() => {
    if (daysOverdue <= 7) return "polite";
    if (daysOverdue <= 21) return "firm";
    return "final";
  }, [daysOverdue]);

  const mailtoHref = useMemo(() => {
    if (!result) return "";
    const bodyForMailto = result.body.replace(/\r\n/g, "\n");
    const recipient = recipientEmail.trim();
    const scheme = recipient
      ? `mailto:${encodeURIComponent(recipient)}`
      : "mailto:";
    return `${scheme}?subject=${encodeURIComponent(result.subject)}&body=${encodeURIComponent(bodyForMailto)}`;
  }, [result, recipientEmail]);

  async function onGenerate() {
    if (!canGenerate || loading) return;
    setLoading(true);
    setError(null);
    setCopied(false);

    try {
      const res = await fetch("/api/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amount.trim(),
          invoiceNumber: invoiceNumber.trim(),
          recipientName: recipientName.trim(),
          senderName: senderName.trim(),
          daysOverdue,
          tone,
        }),
      });

      const json = (await res.json().catch(() => null)) as any;

      const parsed: ApiResult =
        res.ok && json?.subject && json?.body
          ? { ok: true, subject: String(json.subject), body: String(json.body) }
          : { ok: false, error: String(json?.error ?? "Request failed") };

      if (!parsed.ok) {
        setResult(null);
        setError(parsed.error);
        return;
      }

      setResult({ subject: parsed.subject, body: parsed.body });
    } catch (e) {
      setResult(null);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function onCopy() {
    if (!result) return;
    const text = `Subject: ${result.subject}\n\n${result.body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-16">
      <div className="w-full max-w-2xl">
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="px-6 py-8 sm:px-10">
            <div className="flex items-start justify-between gap-6">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
                  Overdue Email Generator
                </h1>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  Generate a clear, professional overdue invoice email in seconds.
                </p>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label>
                <div className="text-sm font-medium text-zinc-900">
                  Invoice Amount
                </div>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder='e.g., "$1,250"'
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-900"
                />
              </label>

              <label>
                <div className="text-sm font-medium text-zinc-900">
                  Invoice number
                </div>
                <input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Optional"
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-900"
                />
              </label>

              <label className="sm:col-span-2">
                <div className="text-sm font-medium text-zinc-900">
                  Recipient email (optional)
                </div>
                <input
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  type="text"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-900"
                />
              </label>

              <label className="sm:col-span-2">
                <div className="text-sm font-medium text-zinc-900">
                  Recipient name
                </div>
                <input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Optional"
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-900"
                />
              </label>

              <label className="sm:col-span-2">
                <div className="text-sm font-medium text-zinc-900">
                  Sender name or business name
                </div>
                <input
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Optional"
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-900"
                />
              </label>

              <label className="sm:col-span-2">
                <div className="text-sm font-medium text-zinc-900">
                  Days Overdue
                </div>
                <input
                  value={Number.isFinite(daysOverdue) ? daysOverdue : 0}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const cleaned = raw.replace(/^0+(?=\d)/, "");
                    setDaysOverdue(cleaned === "" ? 0 : Number(cleaned));
                  }}
                  min={0}
                  type="number"
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-900"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onGenerate}
                disabled={!canGenerate || loading}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-medium text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Generating…" : "Generate Email"}
              </button>

              {!canGenerate ? (
                <div className="text-sm text-zinc-500">
                  Enter an amount and days overdue to generate.
                </div>
              ) : null}

              {error ? (
                <div className="text-sm text-red-600">{error}</div>
              ) : null}
            </div>
          </div>

          {result ? (
            <div className="border-t border-zinc-200 px-6 py-8 sm:px-10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-zinc-600">
                  <span className="font-semibold text-zinc-900">Subject:</span>{" "}
                  <span className="text-zinc-900">{result.subject}</span>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
                  <a
                    href={mailtoHref}
                    className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50 sm:w-auto"
                  >
                    Open in Email
                  </a>
                  <button
                    type="button"
                    onClick={onCopy}
                    className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50 sm:w-auto"
                  >
                    {copied ? "Copied" : "Copy to clipboard"}
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-sm font-medium text-zinc-900">Email body</div>
                <div className="mt-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <textarea
                    value={result.body}
                    readOnly
                    className="h-64 w-full resize-none bg-transparent text-sm leading-6 text-zinc-900 outline-none"
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-6 text-center text-xs text-zinc-500">
          No sign-in. No tracking. Just generate and copy.
        </div>
      </div>
    </div>
  );
}

