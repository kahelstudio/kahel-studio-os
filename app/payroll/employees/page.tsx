import Link from "next/link";
import { getPayrollEmployees } from "@/lib/server/payroll-data";

function formatPHP(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

export default async function PayrollEmployeesPage() {
  const employees = await getPayrollEmployees();

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
        {employees.map((e) => {
          const empType = e.role?.toLowerCase().includes("freelance") ? "Freelance" : "Full-time";
          const typeColors: Record<string, { bg: string; color: string }> = {
            "Full-time": { bg: "var(--color-indigo-100)", color: "var(--color-indigo-800)" },
            Freelance: { bg: "var(--color-teal-100)", color: "var(--color-teal-800)" },
          };
          const tc = typeColors[empType] ?? { bg: "var(--color-surface-muted)", color: "var(--color-text-secondary)" };
          const statusColors: Record<string, { bg: string; color: string; label: string }> = {
            active: { bg: "var(--color-success-bg)", color: "var(--color-success-text)", label: "Active" },
            inactive: { bg: "var(--color-surface-muted)", color: "var(--color-text-muted)", label: "Inactive" },
          };
          const sc = statusColors[e.status] ?? { bg: "var(--color-surface-muted)", color: "var(--color-text-secondary)", label: e.status };
          return (
            <Link
              key={e.id}
              href={`/payroll/employees/${e.id}`}
              className="grid h-14 grid-cols-[1.8fr_1fr_1fr_1fr_1.2fr_1fr] items-center border-b border-[var(--color-border)] px-5 text-sm last:border-b-0 hover:bg-[var(--color-canvas)]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[var(--color-indigo-100)] font-display text-xs font-semibold text-[var(--color-indigo-800)]">
                  {e.initials}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-semibold">{e.name}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">{e.role}</div>
                </div>
              </div>
              <div>
                <span
                  className="rounded-pill px-2.5 py-1 text-xs font-semibold"
                  style={{ background: tc.bg, color: tc.color }}
                >
                  {empType}
                </span>
              </div>
              <div className="text-[var(--color-text-primary)]">Monthly</div>
              <div className="text-[var(--color-text-primary)]">{formatPHP(e.baseSalary)}</div>
              <div className="text-xs text-[var(--color-text-secondary)]">Bank transfer</div>
              <div>
                <span
                  className="rounded-pill px-2.5 py-1 text-xs font-semibold"
                  style={{ background: sc.bg, color: sc.color }}
                >
                  {sc.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
