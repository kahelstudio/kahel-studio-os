import { Plus } from "lucide-react";
import { INVENTORY_EQUIPMENT } from "@/lib/sample-data";

export default function InventoryEquipmentPage() {
  return (
    <div className="max-w-[1200px] p-12 pt-9">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-ink-800)]">
            Equipment
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            The register — every body, lens, and light, by serial
          </p>
        </div>
        <button className="flex h-10 shrink-0 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 font-display text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
          <Plus className="h-4 w-4" /> Add equipment
        </button>
      </div>

      <div className="mt-[26px] overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid h-11 grid-cols-[1.1fr_1.6fr_1fr_1fr_1.4fr] items-center bg-[var(--color-canvas)] px-5 text-xs font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
          <div>Serial</div>
          <div>Item</div>
          <div>Category</div>
          <div>Status</div>
          <div>Location / note</div>
        </div>
        {INVENTORY_EQUIPMENT.map((e) => (
          <div
            key={e.serial}
            className="grid h-[52px] grid-cols-[1.1fr_1.6fr_1fr_1fr_1.4fr] items-center border-b border-[var(--color-ink-100)] px-5 text-sm last:border-b-0 hover:bg-[var(--color-canvas)]"
          >
            <div className="text-[13px] font-medium text-[var(--color-text-primary)]">{e.serial}</div>
            <div className="font-semibold">{e.name}</div>
            <div className="text-[var(--color-text-secondary)]">{e.cat}</div>
            <div>
              <span
                className="rounded-pill px-2.5 py-1 text-xs font-semibold"
                style={{ background: e.stBg, color: e.stColor }}
              >
                {e.stLabel}
              </span>
            </div>
            <div className="text-[13px]" style={{ color: e.noteColor }}>
              {e.note}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
