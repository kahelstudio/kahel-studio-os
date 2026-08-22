export const dynamic = "force-dynamic";

import { Camera, Coins, CreditCard, TrendingUp } from "lucide-react";
import {
  getDashboardKpis,
  getRevenueTrend,
  getDashboardSchedule,
  getDashboardBalances,
  getDashboardInquiries,
} from "@/lib/server/dashboard-data";

const KPI_ICONS = [Coins, TrendingUp, Camera, CreditCard];



function formatCurrency(centavos: number) {
  return `\u20B1${(centavos / 100).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function relativeTime(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffHrs = Math.round(diffMs / (1000 * 60 * 60));
  if (diffHrs < 1) return "Just now";
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.round(diffHrs / 24);
  return `${diffDays}d ago`;
}

function toAmPm(time: string) {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
}

export default async function DashboardPage() {
  const [kpis, revenue, schedule, balances, inquiries] = await Promise.all([
    getDashboardKpis(),
    getRevenueTrend(),
    getDashboardSchedule(),
    getDashboardBalances(),
    getDashboardInquiries(),
  ]);

  const kpiDisplay = [
    { label: "Revenue MTD", value: formatCurrency(kpis.revenueMtd), delta: "MTD", positive: true },
    { label: "Gross profit", value: formatCurrency(kpis.grossProfit), delta: "MTD", positive: true },
    { label: "Avg booking value", value: formatCurrency(kpis.avgBookingValue), delta: "Per booking", positive: true },
    { label: "Outstanding", value: formatCurrency(kpis.outstanding), delta: "Awaiting settlement", positive: false },
  ];

  const totalOutstanding = balances.reduce((s, b) => s + b.balance, 0);

  return (
    <div className="max-w-[1360px] p-12 pt-9">
      <div className="flex items-baseline justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] pb-9">
        <div>
          <h1 className="font-display text-[clamp(1.8rem,4vw,2.25rem)] font-semibold leading-11 tracking-[-0.025em] text-[var(--color-text-primary)]">
            Overview
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">How are we doing this month</p>
        </div>
        <span className="text-xs tracking-[0.04em] text-[var(--color-text-muted)]">
          {new Date().toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "Asia/Manila" }).toUpperCase()} · MTD
        </span>
      </div>

      <div className="mt-6 grid grid-cols-4 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        {kpiDisplay.map((k, i) => {
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
              {revenue.bars.length === 0 && (
                <div className="flex h-full w-full items-center justify-center text-xs text-[var(--color-text-muted)]">
                  No data yet.
                </div>
              )}
              {revenue.bars.map((b, i) => {
                const last = i === revenue.bars.length - 1;
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
                        height: `${Math.round((b.value / revenue.maxValue) * 150)}px`,
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
              {schedule.length}
            </span>
          </div>
          {schedule.length === 0 && (
            <div className="px-[22px] py-6 text-center text-xs text-[var(--color-text-muted)]">
              No bookings scheduled for today.
            </div>
          )}
          {schedule.map((s) => (
            <div key={s.ref} className="flex gap-4 border-b border-[var(--color-border)] px-[22px] py-3.5 last:border-b-0">
              <div className="w-[68px] shrink-0 pt-px text-xs font-medium text-[var(--color-teal-800)]">
                {s.time ? toAmPm(s.time) : "—"}
              </div>
              <div>
                <div className="text-sm font-semibold">{s.type} — {s.client}</div>
                <div className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{s.location}</div>
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
            <span className="font-display text-sm font-semibold text-[#FF5300]">
              {formatCurrency(totalOutstanding)}
            </span>
          </div>
          {balances.length === 0 && (
            <div className="px-[22px] py-6 text-center text-xs text-[var(--color-text-muted)]">
              No outstanding balances.
            </div>
          )}
          {balances.slice(0, 5).map((b) => (
            <div key={b.ref} className="flex items-center gap-3 border-b border-[var(--color-border)] px-[22px] py-3.5 text-sm last:border-b-0">
              <span className="font-semibold">{b.client}</span>
              <span className="text-xs text-[var(--color-text-muted)]">{b.ref}</span>
              <span className="ml-auto font-display font-semibold">{formatCurrency(b.balance)}</span>
            </div>
          ))}
        </div>
        <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex items-baseline justify-between border-b border-[var(--color-border)] px-[22px] pb-3.5 pt-[18px]">
            <span className="font-display text-[13px] font-semibold uppercase tracking-[0.16em]">
              New inquiries
            </span>
            <span className="text-xs tracking-[0.04em] text-[var(--color-text-muted)]">
              {inquiries.length}
            </span>
          </div>
          {inquiries.length === 0 && (
            <div className="px-[22px] py-6 text-center text-xs text-[var(--color-text-muted)]">
              No new inquiries.
            </div>
          )}
          {inquiries.slice(0, 5).map((i) => (
            <div key={i.id} className="flex items-center gap-3 border-b border-[var(--color-border)] px-[22px] py-3.5 text-sm last:border-b-0">
              <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-muted)] font-display text-xs font-semibold text-[var(--color-text-secondary)]">
                {initials(i.client)}
              </div>
              <div>
                <div className="font-semibold">{i.client}</div>
                <div className="text-xs text-[var(--color-text-muted)]">{i.service_type}</div>
              </div>
              <span className="ml-auto text-xs text-[var(--color-text-secondary)]">{relativeTime(i.created_at)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
