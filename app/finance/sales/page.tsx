export const dynamic = "force-dynamic";

import { Download } from "lucide-react";
import { getSales } from "@/lib/server/finance-data";
import { KpiStrip } from "@/components/finance/kpi-strip";
import { ActionButton } from "@/components/shared/action-button";

function formatPhp(amount: number) {
  return `\u20B1${Number(amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function FinanceSalesPage() {
  const sales = await getSales();

  const total = sales.reduce((s, r) => s + Number(r.total), 0);
  const count = sales.length;
  const avg = count > 0 ? total / count : 0;

  const kpis = [
    { label: "Sales total", value: formatPhp(total) },
    { label: "Transactions", value: String(count) },
    { label: "Average sale", value: formatPhp(avg) },
    { label: "Recorded", value: String(count) },
  ];

  const displayRows = sales.map((s) => ({
    ref: s.reference,
    desc: s.client ?? `Sale · ${s.items} item${s.items !== 1 ? "s" : ""}`,
    method: s.method,
    date: formatDate(s.recordedAt),
    amt: formatPhp(Number(s.total)),
  }));

  return (
    <div className="p-12 pt-9">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
            Sales
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            Money in — retail sales and booking payments received
          </p>
        </div>
        <ActionButton label="Export sales" className="flex h-10 shrink-0 items-center gap-1.5 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-semibold text-[var(--color-text-primary)]">
          <Download className="h-4 w-4" /> Export
        </ActionButton>
      </div>

      <KpiStrip kpis={kpis} />

      <div className="mt-5 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid h-11 grid-cols-[1.1fr_1.8fr_1fr_1fr_1fr] items-center bg-[var(--color-canvas)] px-5 text-[11px] font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
          <div>Reference</div>
          <div>Description</div>
          <div>Method</div>
          <div>Date</div>
          <div className="text-right">Amount</div>
        </div>
        {displayRows.map((r) => (
          <div
            key={r.ref}
            className="grid h-[54px] grid-cols-[1.1fr_1.8fr_1fr_1fr_1fr] items-center border-b border-[var(--color-border)] px-5 text-sm last:border-b-0 hover:bg-[var(--color-canvas)]"
          >
            <div className="text-xs font-medium text-[var(--color-text-primary)]">{r.ref}</div>
            <div className="font-medium">{r.desc}</div>
            <div className="text-[var(--color-text-secondary)]">{r.method}</div>
            <div className="text-[var(--color-text-secondary)]">{r.date}</div>
            <div className="text-right font-semibold text-[var(--color-success-text)]">{r.amt}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
