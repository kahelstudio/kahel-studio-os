import { PERFORMANCE_REVIEWS } from "@/lib/sample-data";

export default function PerformanceReviewsPage() {
  return (
    <div className="p-12 pt-9">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
            Reviews
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            H1 2026 cycle — one review due
          </p>
        </div>
        <span className="text-xs tracking-[0.04em] text-[var(--color-text-muted)]">H1 2026</span>
      </div>

      <div className="mt-[26px] overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid h-11 grid-cols-[2fr_1.4fr_1fr_1fr] items-center bg-[var(--color-canvas)] px-5 text-xs font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
          <div>Team member</div>
          <div>Cycle</div>
          <div>Status</div>
          <div className="text-right">Rating</div>
        </div>
        {PERFORMANCE_REVIEWS.map((r) => (
          <div
            key={r.name}
            className="grid h-[58px] grid-cols-[2fr_1.4fr_1fr_1fr] items-center border-b border-[var(--color-border)] px-5 text-sm last:border-b-0 hover:bg-[var(--color-canvas)]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[var(--color-indigo-100)] font-display text-xs font-semibold text-[var(--color-indigo-800)]">
                {r.ini}
              </div>
              <div>
                <div className="font-semibold">{r.name}</div>
                <div className="text-xs text-[var(--color-text-secondary)]">{r.role}</div>
              </div>
            </div>
            <div className="text-[var(--color-text-primary)]">{r.cycle}</div>
            <div>
              <span
                className="rounded-pill px-2.5 py-1 text-xs font-semibold"
                style={{ background: r.stBg, color: r.stColor }}
              >
                {r.stLabel}
              </span>
            </div>
            <div className="text-right font-display text-base font-semibold">{r.rating}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
