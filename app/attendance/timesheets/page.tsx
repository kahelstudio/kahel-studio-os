import { ATTENDANCE_KPIS, ATTENDANCE_ROWS } from "@/lib/sample-data";
import { AttendanceClockCard } from "./attendance-clock-card";

export default function AttendanceTimesheetsPage() {
  return (
    <div className="p-12 pt-9">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
            Timesheets
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            Owner and freelance hours logged against engagements
          </p>
        </div>
        <span className="text-xs tracking-[0.04em] text-[var(--color-text-muted)]">WEEK OF 21 JUL</span>
      </div>

      <AttendanceClockCard />

      <div className="mt-6 grid grid-cols-3 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        {ATTENDANCE_KPIS.map((k, i) => (
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
        {ATTENDANCE_ROWS.map((r) => (
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
  );
}
