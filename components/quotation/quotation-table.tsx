import { Plus } from "lucide-react";
import { QUOTATIONS } from "@/lib/sample-data";

export function QuotationTable({ draftsOnly }: { draftsOnly: boolean }) {
  const rows = draftsOnly ? QUOTATIONS.filter((q) => q.st === "draft") : QUOTATIONS;

  return (
    <div className="max-w-[1100px] p-12 pt-9">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-ink-800)]">
            {draftsOnly ? "Drafts" : "Quotation"}
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            {draftsOnly
              ? "Quotes not yet sent to the client"
              : "Draft, send and track client quotes across the studio"}
          </p>
        </div>
        <button className="flex h-10 shrink-0 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 font-display text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
          <Plus className="h-4 w-4" /> New quotation
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid h-11 grid-cols-[1fr_2fr_1.4fr_1fr_1fr] items-center bg-[var(--color-canvas)] px-5 text-[11px] font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
          <div>Ref</div>
          <div>Client</div>
          <div>Package</div>
          <div>Status</div>
          <div className="text-right">Total</div>
        </div>
        {rows.map((q) => (
          <div
            key={q.ref}
            className="grid min-h-[58px] grid-cols-[1fr_2fr_1.4fr_1fr_1fr] items-center border-b border-[var(--color-ink-100)] px-5 text-[13px] last:border-b-0 hover:bg-[var(--color-canvas)]"
          >
            <div className="text-xs text-[var(--color-text-muted)]">{q.ref}</div>
            <div className="font-semibold text-[var(--color-text-primary)]">{q.client}</div>
            <div>
              <div>{q.type}</div>
              <div className="text-xs text-[var(--color-text-muted)]">{q.valid}</div>
            </div>
            <div>
              <span
                className="rounded-pill px-2.5 py-1 text-[11px] font-semibold"
                style={{ background: q.stBg, color: q.stColor }}
              >
                {q.stL}
              </span>
            </div>
            <div className="text-right text-[13px] font-semibold">{q.total}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
