export const dynamic = "force-dynamic";

import { Plus } from "lucide-react";
import { getExpenses } from "@/lib/server/finance-data";
import { KpiStrip } from "@/components/finance/kpi-strip";
import { OperationCreateButton } from "@/components/shared/operation-create-button";

const CAT_TONES: Record<string, { bg: string; c: string }> = {
  Maintenance: { bg: "var(--color-info-bg)", c: "var(--color-info-text)" },
  Payroll: { bg: "#FFF4EE", c: "var(--color-attention-text)" },
  Equipment: { bg: "var(--color-info-bg)", c: "var(--color-info-text)" },
  Studio: { bg: "var(--color-indigo-100)", c: "var(--color-indigo-800)" },
  Supplies: { bg: "var(--color-teal-100)", c: "var(--color-teal-800)" },
  Utilities: { bg: "var(--color-surface-muted)", c: "var(--color-text-secondary)" },
};

const DEFAULT_TONE = { bg: "var(--color-surface-muted)", c: "var(--color-text-secondary)" };

function formatCurrency(centavos: number) {
  return `\u20B1${(centavos / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function FinanceExpensesPage() {
  const expenses = await getExpenses();

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const categoryCounts = new Map<string, number>();
  for (const e of expenses) {
    categoryCounts.set(e.category, (categoryCounts.get(e.category) ?? 0) + e.amount);
  }
  const largest = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "\u2014";
  const count = expenses.length;

  const kpis = [
    { label: "Expenses total", value: formatCurrency(total) },
    { label: "Largest category", value: largest },
    { label: "Entries", value: String(count) },
    { label: "Categories", value: String(categoryCounts.size) },
  ];

  const displayRows = expenses.map((e) => {
    const tone = CAT_TONES[e.category] ?? DEFAULT_TONE;
    return {
      ref: e.ref,
      cat: e.category,
      catBg: tone.bg,
      catColor: tone.c,
      desc: e.description,
      date: formatDate(e.date),
      amt: formatCurrency(e.amount),
    };
  });

  return (
    <div className="p-12 pt-9">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
            Expenses
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            Money out — recorded studio costs by category
          </p>
        </div>
        <OperationCreateButton kind="expense" className="flex h-10 shrink-0 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 font-display text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
          <Plus className="h-4 w-4" /> Record expense
        </OperationCreateButton>
      </div>

      <KpiStrip kpis={kpis} />

      <div className="mt-5 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid h-11 grid-cols-[1.1fr_1fr_1.6fr_1fr_1fr] items-center bg-[var(--color-canvas)] px-5 text-[11px] font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
          <div>Reference</div>
          <div>Category</div>
          <div>Description</div>
          <div>Date</div>
          <div className="text-right">Amount</div>
        </div>
        {displayRows.map((r) => (
          <div
            key={r.ref}
            className="grid h-[54px] grid-cols-[1.1fr_1fr_1.6fr_1fr_1fr] items-center border-b border-[var(--color-border)] px-5 text-sm last:border-b-0 hover:bg-[var(--color-canvas)]"
          >
            <div className="text-xs font-medium text-[var(--color-text-primary)]">{r.ref}</div>
            <div>
              <span
                className="rounded-pill px-2.5 py-1 text-[11px] font-semibold"
                style={{ background: r.catBg, color: r.catColor }}
              >
                {r.cat}
              </span>
            </div>
            <div className="font-medium">{r.desc}</div>
            <div className="text-[var(--color-text-secondary)]">{r.date}</div>
            <div className="text-right font-semibold text-[var(--color-danger-text)]">−{r.amt}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
