import { USAGE_BARS, USAGE_KPIS } from "@/lib/sample-data";

export default function UsagePage() {
  return (
    <div className="max-w-[1000px] p-12 pt-9">
      <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-ink-800)]">
        Usage
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
        What the studio is consuming this cycle
      </p>

      <div className="mt-6 grid grid-cols-4 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        {USAGE_KPIS.map((k, i) => (
          <div key={k.label} className="px-6 py-5" style={{ borderLeft: i === 0 ? "none" : "1px solid var(--color-ink-100)" }}>
            <div className="text-xs font-medium uppercase tracking-[0.02em] text-[var(--color-text-secondary)]">
              {k.label}
            </div>
            <div className="mt-2.5 font-display text-[26px] font-bold tracking-[-0.02em] text-[var(--color-ink-800)]">
              {k.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] px-[22px] py-2">
        {USAGE_BARS.map((b) => (
          <div key={b.label} className="border-b border-[var(--color-ink-100)] py-4 last:border-b-0">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold">{b.label}</span>
              <span className="text-xs text-[var(--color-text-secondary)]">{b.sub}</span>
            </div>
            <div className="mt-2.5 h-2 overflow-hidden rounded-pill bg-[var(--color-ink-100)]">
              <div className="h-full rounded-pill" style={{ width: `${b.pct}%`, background: b.bar }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
