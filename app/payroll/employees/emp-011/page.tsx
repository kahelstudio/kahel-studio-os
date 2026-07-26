import Link from "next/link";
import { PAYROLL_EMPLOYEE_PROFILE_KT as p } from "@/lib/sample-data";

export default function PayrollEmployeeDetailPage() {
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
          {p.name.split(" ").map((n) => n[0]).join("")}
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em]">{p.name}</h1>
          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
            {p.role} · {p.team} · {p.id}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-[1.3fr_1fr] gap-5">
        <div className="flex flex-col gap-4">
          <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <div className="mb-3.5 font-display text-[15px] font-semibold">Pay basis</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3.5 text-sm">
              <Field label="Employment type" value={p.type} />
              <Field label="Schedule" value={p.schedule} />
              <Field label="Rate" value={p.rate} />
              <Field label="Per cutoff" value={p.semi} />
              <Field label="Payout method" value={p.bank} />
            </div>
          </div>

          <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="border-b border-[var(--color-border)] px-5 py-3.5 font-display text-[15px] font-semibold">
              Earnings
            </div>
            {p.earnings.map((e) => (
              <div key={e.label} className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3 text-sm last:border-b-0">
                <span className="text-[var(--color-text-secondary)]">{e.label}</span>
                <span className="font-semibold">{e.value}</span>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="border-b border-[var(--color-border)] px-5 py-3.5 font-display text-[15px] font-semibold">
              Deductions
            </div>
            {p.deductions.map((d) => (
              <div key={d.label} className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3 text-sm last:border-b-0">
                <span className="text-[var(--color-text-secondary)]">{d.label}</span>
                <span className="font-semibold">{d.value}</span>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="border-b border-[var(--color-border)] px-5 py-3.5 font-display text-[15px] font-semibold">
              Salary history
            </div>
            {p.history.length === 0 ? (
              <div className="px-5 py-4 text-sm text-[var(--color-text-muted)]">No salary changes recorded</div>
            ) : (
              p.history.map((h, i) => (
                <div key={i} className="flex items-center gap-4 border-b border-[var(--color-border)] px-5 py-3 text-sm last:border-b-0">
                  <span className="text-xs text-[var(--color-text-muted)]">{h.date}</span>
                  <span>
                    {h.prev} → <span className="font-semibold">{h.next}</span>
                  </span>
                  <span className="ml-auto text-xs text-[var(--color-text-secondary)]">{h.reason}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <div className="mb-3.5 font-display text-[15px] font-semibold">Government IDs</div>
            <div className="flex flex-col gap-3 text-sm">
              <Field label="SSS" value={p.sss} />
              <Field label="PhilHealth" value={p.ph} />
              <Field label="Pag-IBIG" value={p.pag} />
              <Field label="TIN" value={p.tin} />
            </div>
          </div>

          <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="border-b border-[var(--color-border)] px-5 py-3.5 font-display text-[15px] font-semibold">
              Recent payslips
            </div>
            {p.payslips.length === 0 ? (
              <div className="px-5 py-4 text-sm text-[var(--color-text-muted)]">No payslips available</div>
            ) : (
              p.payslips.map((s) => (
                <div key={s.ref} className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3 text-sm last:border-b-0">
                  <div>
                    <div className="text-xs text-[var(--color-text-muted)]">{s.ref}</div>
                    <div className="text-xs text-[var(--color-text-secondary)]">{s.period}</div>
                  </div>
                  <span className="font-display font-semibold">{s.net}</span>
                </div>
              ))
            )}
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
