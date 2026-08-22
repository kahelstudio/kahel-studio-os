export const dynamic = "force-dynamic";

import { getPayrollEmployees } from "@/lib/server/payroll-data";
import { getRealBookings } from "@/lib/server/bookings-data";
import { AttendanceClockCard } from "./attendance-clock-card";
import Link from "next/link";

const STATUS_META: Record<string, { bg: string; c: string; label: string }> = {
  active: { bg: "var(--color-success-bg)", c: "var(--color-success-text)", label: "Active" },
  pending: { bg: "var(--color-attention-bg)", c: "var(--color-attention-text)", label: "Unsubmitted" },
  inactive: { bg: "var(--color-surface-muted)", c: "var(--color-text-secondary)", label: "Inactive" },
};

export default async function AttendanceTimesheetsPage() {
  const [employees, bookings] = await Promise.all([getPayrollEmployees(), getRealBookings()]);

  const activeBookings = bookings.filter((b) => b.status === "confirmed" || b.status === "progress");
  const employeeCount = employees.length;
  const activeCount = activeBookings.length;
  const pendingCount = employees.filter((e) => e.status === "pending").length;

  const kpis = [
    { label: "Active staff", value: String(employeeCount) },
    { label: "Active engagements", value: String(activeCount) },
    { label: "Unsubmitted", value: String(pendingCount) },
  ];

  const rows = employees.map((e) => {
    const st = e.status === "active" ? "active" : e.status === "pending" ? "pending" : "inactive";
    const meta = STATUS_META[st];
    const booking = activeBookings.find((b) => b.accountId === (e as Record<string, unknown>).clientId);
    return {
      ini: e.initials,
      name: e.name,
      role: e.role,
      hours: "—",
      engagement: booking ? `${booking.account} — ${booking.type}` : "No active engagement",
      st,
      stBg: meta.bg,
      stColor: meta.c,
      stLabel: meta.label,
    };
  });

  return (
    <div>
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] pb-9 pt-[34px] px-4 sm:px-6 flex items-end justify-between">
        <div>
          <h1 className="font-display text-[clamp(1.8rem,4vw,2.25rem)] font-semibold leading-11 tracking-[-0.025em] text-[var(--color-text-primary)]">
            Timesheets
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            Owner and freelance hours logged against engagements
          </p>
        </div>
        <div className="flex items-center gap-3"><span className="hidden text-xs tracking-[0.04em] text-[var(--color-text-muted)] sm:inline">WEEK OF 21 JUL</span><Link href="/approvals?create=attendance_correction" className="inline-flex h-10 items-center rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-semibold text-[#FF5300]">Request correction</Link></div>
      </header>

      <div className="px-4 sm:px-6 pb-12">
      <AttendanceClockCard />

      <div className="mt-6 grid grid-cols-3 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        {kpis.map((k, i) => (
          <div key={k.label} className="px-6 py-5" style={{ borderLeft: i === 0 ? "none" : "1px solid var(--color-border)" }}>
            <div className="text-xs font-medium uppercase tracking-[0.02em] text-[var(--color-text-secondary)]">
              {k.label}
            </div>
            <div className="mt-2.5 font-display text-[30px] font-bold tracking-[-0.02em] text-[var(--color-text-primary)]">
              {k.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid h-11 grid-cols-[1.6fr_1.4fr_1.6fr_1fr] items-center bg-[var(--color-canvas)] px-5 text-xs font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
          <div>Person</div>
          <div>Role</div>
          <div>Engagement</div>
          <div className="text-right">Hours</div>
        </div>
        {rows.map((r) => (
          <div
            key={r.name}
            className="grid h-14 grid-cols-[1.6fr_1.4fr_1.6fr_1fr] items-center border-b border-[var(--color-border)] px-5 text-sm last:border-b-0 hover:bg-[var(--color-canvas)]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[var(--color-indigo-100)] font-display text-xs font-semibold text-[var(--color-indigo-800)]">
                {r.ini}
              </div>
              <div className="min-w-0">
                <div className="truncate font-semibold">{r.name}</div>
                <span
                  className="mt-0.5 inline-block rounded-pill px-2 py-0.5 text-[11px] font-semibold"
                  style={{ background: r.stBg, color: r.stColor }}
                >
                  {r.stLabel}
                </span>
              </div>
            </div>
            <div className="text-[var(--color-text-secondary)]">{r.role}</div>
            <div className="text-[var(--color-text-primary)]">{r.engagement}</div>
            <div className="text-right font-display font-semibold">{r.hours}</div>
          </div>
        ))}
      </div>
    </div>
    </div>
  );
}
