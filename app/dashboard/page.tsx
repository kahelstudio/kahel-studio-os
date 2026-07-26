import { Camera, Coins, CreditCard, TrendingUp } from "lucide-react";
import {
  DASHBOARD_BALANCES,
  DASHBOARD_INQUIRIES,
  DASHBOARD_KPIS,
  DASHBOARD_SCHEDULE,
  REVENUE_CHART,
} from "@/lib/sample-data";

const KPI_ICONS = [Coins, TrendingUp, Camera, CreditCard];
const maxRevenue = Math.max(...REVENUE_CHART.map((c) => c.value));

export default function DashboardPage() {
  return (
    <div className="max-w-[1360px] p-12 pt-9">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
            Overview
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">How are we doing this month</p>
        </div>
        <span className="text-xs tracking-[0.04em] text-[var(--color-text-muted)]">JUL 2026 · MTD</span>
      </div>

      <div className="mt-6 grid grid-cols-4 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        {DASHBOARD_KPIS.map((k, i) => {
          const Icon = KPI_ICONS[i];
          return (
            <div
              key={k.label}
              className="px-6 py-[22px]"
              style={{ borderLeft: i === 0 ? "none" : "1px solid var(--color-border)" }}
            >
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.02em] text-[var(--color-text-secondary)]">
                <Icon className="h-[15px] w-[15px]" strokeWidth={1.75} />
                {k.label}
              </div>
              <div className="mt-3.5 font-display text-[38px] font-bold leading-[1.05] tracking-[-0.02em] text-[var(--color-text-primary)]">
                {k.value}
              </div>
              <div
                className="mt-1.5 text-xs font-semibold"
                style={{ color: k.positive ? "var(--color-success)" : "var(--color-kahel-700)" }}
              >
                {k.delta}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-[1.5fr_1fr] gap-5">
        <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-[22px]">
          <div className="flex items-baseline justify-between border-b border-[var(--color-border)] pb-3.5">
            <span className="font-display text-[13px] font-semibold uppercase tracking-[0.16em]">
              Revenue trend
            </span>
            <span className="text-xs tracking-[0.04em] text-[var(--color-text-muted)]">6 MO</span>
          </div>
          <div className="relative mt-[22px] flex h-[210px] items-end gap-4 border-b border-[var(--color-border)] pb-[26px]">
            {REVENUE_CHART.map((b, i) => {
              const last = i === REVENUE_CHART.length - 1;
              return (
                <div key={b.month} className="flex h-full flex-1 flex-col items-center justify-end gap-2.5">
                  <div
                    className="font-display text-xs font-semibold"
                    style={{ color: last ? "var(--color-kahel-700)" : "var(--color-text-muted)" }}
                  >
                    ₱{b.value}k
                  </div>
                  <div
                    className="w-full rounded-t-[5px]"
                    style={{
                      height: `${Math.round((b.value / maxRevenue) * 150)}px`,
                      background: last ? "var(--color-kahel-500)" : "var(--color-ink-300)",
                    }}
                  />
                  <div className="absolute bottom-0 text-[11px] tracking-[0.03em] text-[var(--color-text-muted)]">
                    {b.month}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex items-baseline justify-between border-b border-[var(--color-border)] px-[22px] pb-3.5 pt-[18px]">
            <span className="font-display text-[13px] font-semibold uppercase tracking-[0.16em]">
              Today&rsquo;s schedule
            </span>
            <span className="text-xs tracking-[0.04em] text-[var(--color-text-muted)]">
              {DASHBOARD_SCHEDULE.length}
            </span>
          </div>
          {DASHBOARD_SCHEDULE.map((s) => (
            <div key={s.time} className="flex gap-4 border-b border-[var(--color-border)] px-[22px] py-3.5 last:border-b-0">
              <div className="w-[68px] shrink-0 pt-px text-xs font-medium text-[var(--color-teal-800)]">{s.time}</div>
              <div>
                <div className="text-sm font-semibold">{s.title}</div>
                <div className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{s.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-5">
        <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex items-baseline justify-between border-b border-[var(--color-border)] px-[22px] pb-3.5 pt-[18px]">
            <span className="font-display text-[13px] font-semibold uppercase tracking-[0.16em]">
              Outstanding balances
            </span>
            <span className="font-display text-sm font-semibold text-[#FF5300]">₱71,000</span>
          </div>
          {DASHBOARD_BALANCES.map((b) => (
            <div key={b.ref} className="flex items-center gap-3 border-b border-[var(--color-border)] px-[22px] py-3.5 text-sm last:border-b-0">
              <span className="font-semibold">{b.name}</span>
              <span className="text-xs text-[var(--color-text-muted)]">{b.ref}</span>
              <span className="ml-auto font-display font-semibold">{b.amount}</span>
            </div>
          ))}
        </div>
        <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex items-baseline justify-between border-b border-[var(--color-border)] px-[22px] pb-3.5 pt-[18px]">
            <span className="font-display text-[13px] font-semibold uppercase tracking-[0.16em]">
              New inquiries
            </span>
            <span className="text-xs tracking-[0.04em] text-[var(--color-text-muted)]">
              {DASHBOARD_INQUIRIES.length}
            </span>
          </div>
          {DASHBOARD_INQUIRIES.map((i) => (
            <div key={i.name} className="flex items-center gap-3 border-b border-[var(--color-border)] px-[22px] py-3.5 text-sm last:border-b-0">
              <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-muted)] font-display text-xs font-semibold text-[var(--color-text-secondary)]">
                {i.ini}
              </div>
              <div>
                <div className="font-semibold">{i.name}</div>
                <div className="text-xs text-[var(--color-text-muted)]">{i.sub}</div>
              </div>
              <span className="ml-auto text-xs text-[var(--color-text-secondary)]">{i.when}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
