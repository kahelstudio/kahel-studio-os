import { getPerformanceReviews, getPerformanceGoals } from "@/lib/server/performance-data";

const KPIS = [
  { label: "Shoots delivered", value: "23", delta: "▲ 4 vs H2 2025", positive: true },
  { label: "Avg delivery time", value: "10.5d", delta: "▼ 1.5d faster", positive: true },
  { label: "Client rating", value: "4.8", delta: "Across 19 reviews", positive: null },
  { label: "Revenue owned", value: "₱1.42M", delta: "▲ 22% YoY", positive: true },
];

export default async function PerformanceMePage() {
  const [reviews, goals] = await Promise.all([getPerformanceReviews(), getPerformanceGoals()]);

  return (
    <div className="max-w-[1100px] p-12 pt-9">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-card bg-[var(--color-indigo-100)] font-display text-xl font-semibold text-[var(--color-indigo-800)]">
          EB
        </div>
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
            My performance
          </h1>
          <p className="mt-0.5 text-[15px] text-[var(--color-text-secondary)]">
            Eusebio Barrun · Owner · Lead photographer
          </p>
        </div>
        <span className="ml-auto text-xs tracking-[0.04em] text-[var(--color-text-muted)]">H1 2026 · MTD</span>
      </div>

      <div className="mt-6 grid grid-cols-4 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        {KPIS.map((k, i) => (
          <div key={k.label} className="px-6 py-[22px]" style={{ borderLeft: i === 0 ? "none" : "1px solid var(--color-border)" }}>
            <div className="text-xs font-medium uppercase tracking-[0.02em] text-[var(--color-text-secondary)]">
              {k.label}
            </div>
            <div className="mt-3 font-display text-[34px] font-bold leading-[1.05] tracking-[-0.02em] text-[var(--color-text-primary)]">
              {k.value}
            </div>
            <div
              className="mt-1.5 text-xs font-semibold"
              style={{ color: k.positive === null ? "var(--color-text-secondary)" : k.positive ? "var(--color-success)" : "var(--color-kahel-700)" }}
            >
              {k.delta}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-[1.4fr_1fr] gap-5">
        <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="border-b border-[var(--color-border)] px-[22px] pb-3.5 pt-[18px]">
            <span className="font-display text-[13px] font-semibold uppercase tracking-[0.16em]">
              Review history
            </span>
          </div>
          {reviews.map((c) => (
            <div key={c.id} className="flex items-center gap-4 border-b border-[var(--color-border)] px-[22px] py-[15px] last:border-b-0">
              <span className="w-[72px] shrink-0 text-[13px] text-[var(--color-text-secondary)]">{c.cycle}</span>
              <div className="min-w-0">
                <div className="text-sm font-semibold">{c.notes ?? c.name}</div>
                {c.status === "done" && (
                  <span className="mt-0.5 inline-block rounded-pill bg-[var(--color-success-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-success-text)]">
                    Completed
                  </span>
                )}
              </div>
              <span className="ml-auto font-display text-xl font-bold text-[var(--color-text-primary)]">{c.rating ?? "—"}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-5 self-start rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-[22px]">
          <div className="border-b border-[var(--color-border)] pb-3.5 font-display text-[13px] font-semibold uppercase tracking-[0.16em]">
            My goals
          </div>
          {goals.map((g) => (
            <div key={g.id}>
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-[13px] font-semibold">{g.label}</span>
                <span className="text-xs text-[var(--color-text-secondary)]">{g.detail ?? `${g.progressPct}%`}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-pill bg-[var(--color-surface-muted)]">
                <div className="h-full rounded-pill bg-[var(--color-indigo-500)]" style={{ width: `${g.progressPct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
