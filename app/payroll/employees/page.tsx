import Link from "next/link";
import { PAYROLL_EMPLOYEES } from "@/lib/sample-data";

export default function PayrollEmployeesPage() {
  return (
    <div className="p-10 pb-14 pt-8">
      <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
        Employees
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
        Pay basis, rate and payout method for every person on payroll
      </p>

      <div className="mt-6 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid h-11 grid-cols-[1.8fr_1fr_1fr_1fr_1.2fr_1fr] items-center bg-[var(--color-canvas)] px-5 text-xs font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
          <div>Name</div>
          <div>Type</div>
          <div>Basis</div>
          <div>Rate</div>
          <div>Method</div>
          <div>Status</div>
        </div>
        {PAYROLL_EMPLOYEES.map((e) => (
          <Link
            key={e.id}
            href={`/payroll/employees/${e.id.toLowerCase()}`}
            className="grid h-14 grid-cols-[1.8fr_1fr_1fr_1fr_1.2fr_1fr] items-center border-b border-[var(--color-border)] px-5 text-sm last:border-b-0 hover:bg-[var(--color-canvas)]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[var(--color-indigo-100)] font-display text-xs font-semibold text-[var(--color-indigo-800)]">
                {e.ini}
              </div>
              <div className="min-w-0">
                <div className="truncate font-semibold">{e.name}</div>
                <div className="text-xs text-[var(--color-text-muted)]">{e.role}</div>
              </div>
            </div>
            <div>
              <span className="rounded-pill px-2.5 py-1 text-xs font-semibold" style={{ background: e.tBg, color: e.tColor }}>
                {e.type}
              </span>
            </div>
            <div className="text-[var(--color-text-primary)]">{e.basis}</div>
            <div className="text-[var(--color-text-primary)]">{e.rate}</div>
            <div className="text-xs text-[var(--color-text-secondary)]">{e.method}</div>
            <div>
              <span
                className="rounded-pill px-2.5 py-1 text-xs font-semibold"
                style={{ background: e.readyBg, color: e.readyColor }}
              >
                {e.readyLabel}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
