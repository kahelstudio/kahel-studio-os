export function KpiStrip({ kpis }: { kpis: { label: string; value: string }[] }) {
  return (
    <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
      {kpis.map((k, i) => (
        <div
          key={k.label}
          className="min-w-0 border-b border-[var(--color-border)] px-4 py-4 last:border-b-0 sm:px-6 sm:py-5"
          style={{ borderLeft: i === 0 ? "none" : "1px solid var(--color-border)" }}
        >
          <div className="text-xs font-medium uppercase tracking-[0.02em] text-[var(--color-text-secondary)]">
            {k.label}
          </div>
          <div className="mt-2.5 font-display text-[26px] font-bold tracking-[-0.02em] text-[var(--color-text-primary)]">
            {k.value}
          </div>
        </div>
      ))}
    </div>
  );
}
