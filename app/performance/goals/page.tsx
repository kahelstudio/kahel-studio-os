export const dynamic = "force-dynamic";

import { getPerformanceGoals } from "@/lib/server/performance-data";

export default async function PerformanceGoalsPage() {
  const goals = await getPerformanceGoals();

  return (
    <div className="max-w-[820px]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] pb-9 pt-[34px] px-4 sm:px-6">
      <h1 className="font-display text-[clamp(1.8rem,4vw,2.25rem)] font-semibold leading-11 tracking-[-0.025em] text-[var(--color-text-primary)]">
        Goals
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">Studio objectives for the half</p>
      </header>

      <div className="px-4 sm:px-6 pb-12">
      <div className="mt-6 flex flex-col gap-5 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        {goals.map((g) => (
          <div key={g.id}>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-sm font-semibold">{g.label}</span>
              <span className="text-[13px] text-[var(--color-text-secondary)]">
                {g.progressPct}% · {g.detail ?? ""}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-pill bg-[var(--color-surface-muted)]">
              <div
                className="h-full rounded-pill bg-[var(--color-indigo-500)]"
                style={{ width: `${Math.min(g.progressPct, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
    </div>
  );
}
