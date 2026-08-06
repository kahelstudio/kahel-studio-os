export const dynamic = "force-dynamic";

import { get13thMonthData } from "@/lib/server/payroll-data";

const php = (n: number) =>
  n === 0 ? "₱0.00" : `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS: Record<string, { bg: string; c: string; label: string }> = {
  ready: { bg: "var(--color-info-bg)", c: "var(--color-info-text)", label: "Ready" },
  partial: { bg: "var(--color-warning-bg)", c: "var(--color-warning-text)", label: "Partial" },
  paid: { bg: "var(--color-success-bg)", c: "var(--color-success-text)", label: "Paid" },
  excluded: { bg: "var(--color-surface-muted)", c: "var(--color-text-muted)", label: "Not eligible" },
};

export default async function Payroll13thPage() {
  const data = await get13thMonthData();

  return (
    <div className="p-10 pb-14 pt-8">
      <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
        13th-month pay
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
        {data.eligible} eligible · {php(data.earnedTotal)} earned · {php(data.balanceTotal)} balance
      </p>

      {data.rows.length === 0 ? (
        <div className="mt-6 flex items-center justify-center rounded-card border border-dashed border-[var(--color-border)] py-16 text-sm text-[var(--color-text-muted)]">
          No payroll employees found.
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="grid h-11 grid-cols-[1.6fr_1.2fr_1.2fr_1fr_1fr_1fr] items-center bg-[var(--color-canvas)] px-5 text-xs font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
            <div>Employee</div>
            <div className="text-right">Basis (YTD)</div>
            <div className="text-right">Earned</div>
            <div className="text-right">Paid</div>
            <div className="text-right">Balance</div>
            <div>Status</div>
          </div>
          {data.rows.map((r) => {
            const st = STATUS[r.status];
            return (
              <div
                key={r.id}
                className="grid h-14 grid-cols-[1.6fr_1.2fr_1.2fr_1fr_1fr_1fr] items-center border-b border-[var(--color-border)] px-5 text-sm last:border-b-0"
              >
                <div className="font-semibold">{r.name}</div>
                <div className="text-right text-[var(--color-text-primary)]">
                  {r.status === "excluded" ? "—" : php(r.basis)}
                </div>
                <div className="text-right font-display font-semibold">
                  {r.status === "excluded" ? "—" : php(r.earned)}
                </div>
                <div className="text-right text-[var(--color-text-secondary)]">
                  {r.status === "excluded" ? "—" : php(r.paid)}
                </div>
                <div className="text-right font-display font-semibold">
                  {r.status === "excluded" ? "—" : php(r.balance)}
                </div>
                <div>
                  <span className="rounded-pill px-2.5 py-1 text-xs font-semibold" style={{ background: st.bg, color: st.c }}>
                    {st.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
