import { FEEDBACK_REPORTS } from "@/lib/sample-data";

export default function FeedbackMyReportsPage() {
  return (
    <div className="max-w-[820px] p-10 pt-8">
      <h1 className="font-display text-[32px] font-semibold tracking-[-0.02em] text-[var(--color-ink-800)]">
        My reports
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
        Everything you&rsquo;ve sent, and where it stands.
      </p>

      <div className="mt-[22px] overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        {FEEDBACK_REPORTS.map((r) => (
          <div
            key={r.iid}
            className="flex items-center gap-4 border-b border-[var(--color-ink-100)] px-5 py-4 last:border-b-0"
          >
            <span
              className="shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-semibold"
              style={{ background: r.kb, color: r.kc }}
            >
              {r.kind}
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{r.summary}</div>
              <div className="font-mono text-xs text-[var(--color-text-muted)]">
                {r.iid} · {r.app}
              </div>
            </div>
            <span className="ml-auto flex shrink-0 items-center gap-1.5 text-[13px] font-semibold" style={{ color: r.sc }}>
              <span className="h-2 w-2 rounded-full bg-current" />
              {r.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
