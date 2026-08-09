import { Plus } from "lucide-react";
import type { QuotationRow } from "@/lib/server/quotation-data";
import { OperationCreateButton } from "@/components/shared/operation-create-button";

const STATUS_STYLES: Record<string, { bg: string; c: string; l: string }> = {
  draft: { bg: "var(--color-surface-muted)", c: "var(--color-text-primary)", l: "Draft" },
  sent: { bg: "var(--color-info-bg)", c: "var(--color-info-text)", l: "Sent" },
  accepted: { bg: "var(--color-success-bg)", c: "var(--color-success-text)", l: "Accepted" },
  expired: { bg: "var(--color-danger-bg)", c: "var(--color-danger-text)", l: "Expired" },
};

function formatCurrency(centavos: number) {
  return `₱${centavos.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function QuotationTable({
  rows,
  draftsOnly,
}: {
  rows: QuotationRow[];
  draftsOnly: boolean;
}) {
  return (
    <div className="p-12 pt-9">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
            {draftsOnly ? "Drafts" : "Quotation"}
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            {draftsOnly
              ? "Quotes not yet sent to the client"
              : "Draft, send and track client quotes across the studio"}
          </p>
        </div>
        <OperationCreateButton kind="quotation" className="flex h-10 shrink-0 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 font-display text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
          <Plus className="h-4 w-4" /> New quotation
        </OperationCreateButton>
      </div>

      <div className="mt-6 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid h-11 grid-cols-[1fr_2fr_1.4fr_1fr_1fr] items-center bg-[var(--color-canvas)] px-5 text-[11px] font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
          <div>Ref</div>
          <div>Client</div>
          <div>Package</div>
          <div>Status</div>
          <div className="text-right">Total</div>
        </div>
        {rows.map((q) => {
          const st = STATUS_STYLES[q.status] ?? STATUS_STYLES.draft;
          return (
            <div
              key={q.id}
              className="grid min-h-[58px] grid-cols-[1fr_2fr_1.4fr_1fr_1fr] items-center border-b border-[var(--color-border)] px-5 text-[13px] last:border-b-0 hover:bg-[var(--color-canvas)]"
            >
              <div className="text-xs text-[var(--color-text-muted)]">{q.reference}</div>
              <div className="font-semibold text-[var(--color-text-primary)]">{q.client}</div>
              <div>
                <div>{q.serviceType}</div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {q.validUntil ? `Valid to ${new Date(q.validUntil).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : "Not sent"}
                </div>
              </div>
              <div>
                <span
                  className="rounded-pill px-2.5 py-1 text-[11px] font-semibold"
                  style={{ background: st.bg, color: st.c }}
                >
                  {st.l}
                </span>
              </div>
              <div className="text-right text-[13px] font-semibold">{formatCurrency(q.total)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
