import { Plus } from "lucide-react";
import { getInvoices, getFinanceKpis } from "@/lib/server/finance-data";
import { KpiStrip } from "@/components/finance/kpi-strip";

const KIND_COLORS: Record<string, { bg: string; c: string }> = {
  deposit: { bg: "var(--color-info-bg)", c: "var(--color-info-text)" },
  balance: { bg: "var(--color-attention-bg)", c: "var(--color-attention-text)" },
  full: { bg: "var(--color-success-bg)", c: "var(--color-success-text)" },
  pending: { bg: "var(--color-warning-bg)", c: "var(--color-warning-text)" },
  void: { bg: "var(--color-surface-muted)", c: "var(--color-text-secondary)" },
};

function getInvoiceKindAndColors(invoice: { total: number; paid: number; status: string }) {
  if (invoice.status === "cancelled") return { kind: "Void", bg: KIND_COLORS.void.bg, color: KIND_COLORS.void.c };
  if (invoice.total === invoice.paid) return { kind: "Full", bg: KIND_COLORS.full.bg, color: KIND_COLORS.full.c };
  if (invoice.paid > 0) return { kind: "Deposit", bg: KIND_COLORS.deposit.bg, color: KIND_COLORS.deposit.c };
  if (invoice.status === "overdue") return { kind: "Balance", bg: KIND_COLORS.balance.bg, color: KIND_COLORS.balance.c };
  return { kind: "Pending", bg: KIND_COLORS.pending.bg, color: KIND_COLORS.pending.c };
}

function formatCurrency(centavos: number) {
  return `\u20B1${(centavos / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "\u2014";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function FinanceInvoicesPage() {
  const [invoices, kpisData] = await Promise.all([getInvoices(), getFinanceKpis()]);

  const kpis = [
    { label: "Recorded MTD", value: formatCurrency(kpisData.recordedMtd).replace(/\.00$/, "") },
    { label: "Booklet remaining", value: formatCurrency(kpisData.bookletRemaining).replace(/\.00$/, "") },
    { label: "Unreconciled", value: formatCurrency(kpisData.unreconciled).replace(/\.00$/, "") },
  ];

  const displayRows = invoices.map((inv) => {
    const { kind, bg, color } = getInvoiceKindAndColors(inv);
    return {
      serial: inv.reference,
      ref: inv.client,
      kindLabel: kind,
      kindBg: bg,
      kindColor: color,
      amount: formatCurrency(inv.total),
      issued: formatDate(inv.issuedAt),
    };
  });

  return (
    <div className="p-12 pt-9">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
            Invoice records
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            Recorded from printed BIR booklets — the system never generates an invoice
          </p>
        </div>
        <button className="flex h-10 shrink-0 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 font-display text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
          <Plus className="h-4 w-4" /> Record serial
        </button>
      </div>

      <KpiStrip kpis={kpis} />

      <div className="mt-5 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid h-11 grid-cols-[1.2fr_1.2fr_1fr_1fr_1fr] items-center bg-[var(--color-canvas)] px-5 text-xs font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
          <div>BIR serial</div>
          <div>Source</div>
          <div>Kind</div>
          <div>Issued</div>
          <div className="text-right">Amount</div>
        </div>
        {displayRows.map((r) => (
          <div
            key={r.serial}
            className="grid h-[52px] grid-cols-[1.2fr_1.2fr_1fr_1fr_1fr] items-center border-b border-[var(--color-border)] px-5 text-sm last:border-b-0 hover:bg-[var(--color-canvas)]"
          >
            <div className="text-[13px] font-medium text-[var(--color-text-primary)]">{r.serial}</div>
            <div className="text-[13px] text-[var(--color-text-secondary)]">{r.ref}</div>
            <div>
              <span
                className="rounded-pill px-2.5 py-1 text-xs font-semibold"
                style={{ background: r.kindBg, color: r.kindColor }}
              >
                {r.kindLabel}
              </span>
            </div>
            <div className="text-[var(--color-text-secondary)]">{r.issued}</div>
            <div className="text-right font-display font-semibold">{r.amount}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
