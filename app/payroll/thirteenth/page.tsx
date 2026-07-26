import { PAYROLL_13TH, PAYROLL_13TH_TOTALS } from "@/lib/sample-data";

export default function Payroll13thPage() {
  return (
    <div className="p-10 pb-14 pt-8">
      <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
        13th-month pay
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
        {PAYROLL_13TH_TOTALS.eligible} eligible · {PAYROLL_13TH_TOTALS.earned} earned · {PAYROLL_13TH_TOTALS.bal} balance
      </p>

      <div className="mt-6 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid h-11 grid-cols-[1.6fr_1.2fr_1.2fr_1fr_1fr_1fr] items-center bg-[var(--color-canvas)] px-5 text-xs font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
          <div>Employee</div>
          <div className="text-right">Basis (YTD)</div>
          <div className="text-right">Earned</div>
          <div className="text-right">Paid</div>
          <div className="text-right">Balance</div>
          <div>Status</div>
        </div>
        {PAYROLL_13TH.map((r) => (
          <div
            key={r.name}
            className="grid h-14 grid-cols-[1.6fr_1.2fr_1.2fr_1fr_1fr_1fr] items-center border-b border-[var(--color-border)] px-5 text-sm last:border-b-0"
          >
            <div className="font-semibold">{r.name}</div>
            <div className="text-right text-[var(--color-text-primary)]">{r.basis}</div>
            <div className="text-right font-display font-semibold">{r.earned}</div>
            <div className="text-right text-[var(--color-text-secondary)]">{r.paid}</div>
            <div className="text-right font-display font-semibold">{r.bal}</div>
            <div>
              <span
                className="rounded-pill px-2.5 py-1 text-xs font-semibold"
                style={{ background: r.stBg, color: r.stColor }}
              >
                {r.stL}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
