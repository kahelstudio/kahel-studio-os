import { Plus } from "lucide-react";
import { POS_CATALOGS } from "@/lib/sample-data";

export function CatalogView({ catalogKey }: { catalogKey: keyof typeof POS_CATALOGS }) {
  const catalog = POS_CATALOGS[catalogKey];
  const hasQty = catalog.data.some((d) => d.qty);

  return (
    <div className="p-10 pt-8">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="font-display text-[32px] font-semibold tracking-[-0.02em] text-[var(--color-ink-800)]">
            {catalog.title}
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">{catalog.sub}</p>
        </div>
        <button className="flex h-10 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 font-display text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
          <Plus className="h-4 w-4" /> New item
        </button>
      </div>

      <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid h-11 grid-cols-[1fr_1.6fr_1.8fr_1fr_1fr] items-center bg-[var(--color-canvas)] px-[18px] text-xs font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
          <div>Code</div>
          <div>Item</div>
          <div>Detail</div>
          <div className="text-right">Price</div>
          <div className="text-right">{catalog.unit}</div>
        </div>
        {catalog.data.map((c) => (
          <div
            key={c.code}
            className="grid min-h-[54px] grid-cols-[1fr_1.6fr_1.8fr_1fr_1fr] items-center border-b border-[var(--color-ink-100)] px-[18px] text-sm last:border-b-0 hover:bg-[var(--color-canvas)]"
          >
            <div className="font-mono text-[13px] text-[var(--color-ink-500)]">{c.code}</div>
            <div className="font-semibold text-[var(--color-text-primary)]">{c.name}</div>
            <div className="text-[13px] text-[var(--color-ink-600)]">{c.detail}</div>
            <div className="text-right font-display font-semibold">{c.price}</div>
            <div className="text-right text-[13px] text-[var(--color-text-muted)]">{hasQty ? c.qty : ""}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
