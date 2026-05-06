"use client";

import { useMemo, useState } from "react";

type Tone = "polite" | "firm" | "final";

type ApiResult =
  | { ok: true; subject: string; body: string }
  | { ok: false; error: string };

export default function Page() {
  const [amount, setAmount] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [daysOverdue, setDaysOverdue] = useState<number>(7);
  const [tone, setTone] = useState<Tone>("polite");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ subject: string; body: string } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canGenerate = useMemo(() => {
    return amount.trim().length > 0 && Number.isFinite(daysOverdue) && daysOverdue >= 0;
  }, [amount, daysOverdue]);

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

              <label>
                <div className="text-sm font-medium text-zinc-900">
                  Days Overdue
                </div>
                <input
                  value={Number.isFinite(daysOverdue) ? daysOverdue : 0}
                  onChange={(e) => setDaysOverdue(Number(e.target.value))}
                  min={0}
                  type="number"
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-900"
                />
              </label>

              <label>
                <div className="text-sm font-medium text-zinc-900">Tone</div>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value as Tone)}
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none ring-0 focus:border-zinc-900"
                >
                  <option value="polite">Polite</option>
                  <option value="firm">Firm</option>
                  <option value="final">Final</option>
                </select>
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
                <button
                  type="button"
                  onClick={onCopy}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50"
                >
                  {copied ? "Copied" : "Copy to clipboard"}
                </button>
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

