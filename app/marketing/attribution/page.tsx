import { MARKETING_SOURCES } from "@/lib/sample-data";

export default function MarketingAttributionPage() {
  return (
    <div className="max-w-[820px] p-12 pt-9">
      <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-ink-800)]">
        Attribution
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
        Where this month&rsquo;s bookings came from, by first touch
      </p>

      <div className="mt-6 flex flex-col gap-[18px] rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        {MARKETING_SOURCES.map((s) => (
          <div key={s.label}>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-sm font-semibold" style={{ color: s.labelColor }}>
                {s.label}
              </span>
              <span className="text-[13px] text-[var(--color-text-secondary)]">
                <span className="font-display font-semibold text-[var(--color-text-primary)]">{s.val}</span> ·{" "}
                {s.pct}%
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-pill bg-[var(--color-ink-100)]">
              <div className="h-full rounded-pill" style={{ width: `${s.pct}%`, background: s.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
