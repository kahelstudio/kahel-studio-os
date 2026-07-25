import { PERFORMANCE_GOALS } from "@/lib/sample-data";

export default function PerformanceGoalsPage() {
  return (
    <div className="max-w-[820px] p-12 pt-9">
      <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-ink-800)]">
        Goals
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">Studio objectives for the half</p>

      <div className="mt-6 flex flex-col gap-5 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        {PERFORMANCE_GOALS.map((g) => (
          <div key={g.label}>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-sm font-semibold">{g.label}</span>
              <span className="text-[13px] text-[var(--color-text-secondary)]">{g.val}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-pill bg-[var(--color-ink-100)]">
              <div className="h-full rounded-pill bg-[var(--color-indigo-500)]" style={{ width: `${g.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
