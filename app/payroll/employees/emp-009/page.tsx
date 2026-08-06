export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getPayrollEmployeeById } from "@/lib/server/payroll-data";

function formatPHP(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

export default async function PayrollEmployeeDetailPage() {
  const id = "emp-009";
  const e = await getPayrollEmployeeById(id);
  if (!e) notFound();

  return (
    <div className="p-10 pb-14 pt-6">
      <Link
        href="/payroll/employees"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
      >
        ‹ Employees
      </Link>

      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-indigo-100)] font-display text-xl font-semibold text-[var(--color-indigo-800)]">
          {e.initials}
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em]">{e.name}</h1>
          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
            {e.role} · {e.status === "active" ? "Operations" : "—"} · {e.employeeRef}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-[1.3fr_1fr] gap-5">
        <div className="flex flex-col gap-4">
          <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <div className="mb-3.5 font-display text-[15px] font-semibold">Pay basis</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3.5 text-sm">
              <Field label="Employment type" value="Full-time" />
              <Field label="Schedule" value="5 days · 8 hrs" />
              <Field label="Rate" value={formatPHP(e.baseSalary)} />
              <Field label="Per cutoff" value={formatPHP(e.baseSalary / 2)} />
              <Field label="Payout method" value="Bank transfer" />
            </div>
          </div>

          <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="border-b border-[var(--color-border)] px-5 py-3.5 font-display text-[15px] font-semibold">
              Earnings
            </div>
            <div className="px-5 py-4 text-sm text-[var(--color-text-muted)]">Earnings data available from active pay run</div>
          </div>

          <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="border-b border-[var(--color-border)] px-5 py-3.5 font-display text-[15px] font-semibold">
              Deductions
            </div>
            <div className="px-5 py-4 text-sm text-[var(--color-text-muted)]">Deduction data available from active pay run</div>
          </div>

          <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="border-b border-[var(--color-border)] px-5 py-3.5 font-display text-[15px] font-semibold">
              Salary history
            </div>
            {e.hiredAt ? (
              <div className="flex items-center gap-4 border-b border-[var(--color-border)] px-5 py-3 text-sm last:border-b-0">
                <span className="text-xs text-[var(--color-text-muted)]">
                  {new Date(e.hiredAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
                <span className="font-semibold">Hired at {formatPHP(e.baseSalary)}</span>
              </div>
            ) : (
              <div className="px-5 py-4 text-sm text-[var(--color-text-muted)]">No salary changes recorded</div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <div className="mb-3.5 font-display text-[15px] font-semibold">Government IDs</div>
            <div className="flex flex-col gap-3 text-sm">
              <Field label="SSS" value={e.sssNumber ?? "—"} />
              <Field label="PhilHealth" value={e.philhealthNumber ?? "—"} />
              <Field label="Pag-IBIG" value={e.pagibigNumber ?? "—"} />
              <Field label="TIN" value={e.tin ?? "—"} />
            </div>
          </div>

          <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="border-b border-[var(--color-border)] px-5 py-3.5 font-display text-[15px] font-semibold">
              Recent payslips
            </div>
            <div className="px-5 py-4 text-sm text-[var(--color-text-muted)]">Payslip data available from active pay run</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--color-text-secondary)]">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}
