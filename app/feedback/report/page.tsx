"use client";

import { useState } from "react";
import { Info, TriangleAlert } from "lucide-react";
import { useToast } from "@/components/toast/toast-provider";
import { cn } from "@/lib/utils";

export default function FeedbackReportPage() {
  const { fireToast } = useToast();
  const [kind, setKind] = useState<"problem" | "idea">("problem");
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    if (pending) return;
    if (text.trim().length < 10) { setError("Please include at least 10 characters so the team can act on the report."); return; }
    setPending(true); setError("");
    try {
      const app = window.location.pathname.split("/").filter(Boolean)[0] ?? "OS";
      const response = await fetch("/api/feedback/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, summary: text, app }) });
      const result = await response.json().catch(() => ({})) as { error?: string }; if (!response.ok) throw new Error(result.error ?? "Unable to send the report.");
      fireToast("Report sent · thanks for flagging it", "success"); setText("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to send the report."); }
    finally { setPending(false); }
  }

  return (
    <div className="app-page flex justify-center p-12">
      <div className="w-[560px]">
        <h1 className="font-display text-[32px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
          Report a problem
        </h1>
        <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
          Two questions. We capture the rest — app, screen, and device — automatically.
        </p>

        <div className="mt-[22px] rounded-modal border border-[var(--color-border)] bg-[var(--color-surface)] p-[26px]">
          <div className="mb-5 flex gap-2.5">
            <button
              onClick={() => setKind("problem")}
              className={cn(
                "flex h-11 flex-1 items-center justify-center gap-2 rounded-control text-sm font-semibold",
                kind === "problem"
                  ? "border-2 border-[var(--color-text-primary)] bg-[var(--color-surface)]"
                  : "border border-[var(--color-border)] bg-[var(--color-surface)] font-medium text-[var(--color-text-secondary)]"
              )}
            >
              <TriangleAlert className="h-4 w-4" strokeWidth={1.75} /> Report a problem
            </button>
            <button
              onClick={() => setKind("idea")}
              className={cn(
                "h-11 flex-1 rounded-control text-sm",
                kind === "idea"
                  ? "border-2 border-[var(--color-text-primary)] bg-[var(--color-surface)] font-semibold"
                  : "border border-[var(--color-border)] bg-[var(--color-surface)] font-medium text-[var(--color-text-secondary)]"
              )}
            >
              Suggest an improvement
            </button>
          </div>

          <div className="mb-2 text-[13px] font-semibold text-[var(--color-text-primary)]">What happened?</div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="The balance shown on the Reyes booking doesn't match the deposit I recorded this morning…"
            className="min-h-[120px] w-full resize-none rounded-control border border-[var(--color-border)] p-3.5 text-sm outline-none placeholder:text-[var(--color-text-muted)]"
          />
          {error ? <p className="mt-2 text-sm text-[var(--color-danger-text)]" role="alert">{error}</p> : null}

          <div className="mt-4 flex items-center gap-2.5 rounded-control border border-[var(--color-border)] bg-[var(--color-canvas)] px-3.5 py-3 text-xs text-[var(--color-text-secondary)]">
            <Info className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            Captured automatically: Booking · /bookings/KS-2026-0151 · Chrome · 21 Jul 2026 09:14
          </div>

          <button
            onClick={send}
            disabled={pending}
            className="mt-[18px] h-12 w-full rounded-control bg-[var(--color-kahel-500)] text-[15px] font-semibold text-white hover:bg-[var(--color-kahel-600)]"
          >
            {pending ? "Sending..." : "Send report"}
          </button>
        </div>
      </div>
    </div>
  );
}
