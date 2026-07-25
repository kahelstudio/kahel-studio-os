export function KpiStrip({ kpis }: { kpis: { label: string; value: string }[] }) {
  return (
    <div
      className="mt-6 grid overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]"
      style={{ gridTemplateColumns: `repeat(${kpis.length}, 1fr)` }}
    >
      {kpis.map((k, i) => (
        <div
          key={k.label}
          className="px-6 py-5"
          style={{ borderLeft: i === 0 ? "none" : "1px solid var(--color-ink-100)" }}
        >
          <div className="text-xs font-medium uppercase tracking-[0.02em] text-[var(--color-text-secondary)]">
            {k.label}
          </div>
          <div className="mt-2.5 font-display text-[26px] font-bold tracking-[-0.02em] text-[var(--color-ink-800)]">
            {k.value}
          </div>
        </div>
      ))}
    </div>
  );
}
