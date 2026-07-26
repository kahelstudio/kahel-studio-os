import { PAYROLL_PAYSLIPS } from "@/lib/sample-data";

export default function PayrollPayslipsPage() {
  return (
    <div className="p-10 pb-14 pt-8">
      <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
        Payslips
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
        Generated payslips across every pay run
      </p>

      <div className="mt-6 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid h-11 grid-cols-[1.4fr_1.6fr_1.2fr_1fr_1fr] items-center bg-[var(--color-canvas)] px-5 text-xs font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
          <div>Reference</div>
          <div>Employee</div>
          <div>Period</div>
          <div className="text-right">Net pay</div>
          <div>Status</div>
        </div>
        {PAYROLL_PAYSLIPS.map((p) => (
          <div
            key={p.ref}
            className="grid h-14 grid-cols-[1.4fr_1.6fr_1.2fr_1fr_1fr] items-center border-b border-[var(--color-border)] px-5 text-sm last:border-b-0 hover:bg-[var(--color-canvas)]"
          >
            <div className="text-xs text-[var(--color-text-muted)]">{p.ref}</div>
            <div className="font-semibold">{p.emp}</div>
            <div className="text-[var(--color-text-primary)]">{p.period}</div>
            <div className="text-right font-display font-semibold">{p.net}</div>
            <div>
              <span
                className="rounded-pill px-2.5 py-1 text-xs font-semibold"
                style={{ background: p.stBg, color: p.stColor }}
              >
                {p.stL}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
