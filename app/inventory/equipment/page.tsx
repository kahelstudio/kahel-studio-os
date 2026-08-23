export const dynamic = "force-dynamic";

import { Plus } from "lucide-react";
import { getEquipment } from "@/lib/server/inventory-data";
import { OperationCreateButton } from "@/components/shared/operation-create-button";
import { EquipmentRowActions } from "@/components/inventory/equipment-row-actions";

const INV_STATUS: Record<string, { bg: string; c: string; label: string }> = {
  available: { bg: "var(--color-success-bg)", c: "var(--color-success-text)", label: "Available" },
  out: { bg: "var(--color-attention-bg)", c: "var(--color-attention-text)", label: "Checked out" },
  maint: { bg: "var(--color-danger-bg)", c: "var(--color-danger-text)", label: "Maintenance" },
};

export default async function InventoryEquipmentPage() {
  const equipment = await getEquipment();

  return (
    <div>
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] pb-9 pt-[34px] px-4 sm:px-6 flex items-end justify-between">
        <div>
          <h1 className="font-display text-[clamp(1.8rem,4vw,2.25rem)] font-semibold leading-11 tracking-[-0.025em] text-[var(--color-text-primary)]">
            Equipment
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            The register — every body, lens, and light, by serial
          </p>
        </div>
        <OperationCreateButton kind="equipment" className="flex h-10 shrink-0 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 font-display text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]"><Plus className="h-4 w-4" /> Add equipment</OperationCreateButton>
      </header>

      <div className="px-4 sm:px-6 pb-12">
      <div className="mt-[26px] overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid h-11 grid-cols-[0.9fr_1.1fr_1.6fr_1fr_1fr_1.4fr_auto] items-center bg-[var(--color-canvas)] px-5 text-xs font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
          <div>ID Tag</div>
          <div>Serial</div>
          <div>Item</div>
          <div>Category</div>
          <div>Status</div>
          <div>Location / note</div>
          <div>Actions</div>
        </div>
        {equipment.map((e) => {
          const st = INV_STATUS[e.status] ?? INV_STATUS.available;
          const note = e.note ?? e.location ?? "—";
          const noteColor = e.status === "maint" ? "var(--color-danger-text)" : "var(--color-text-secondary)";
          return (
            <div
              key={e.serial}
              className="grid h-[52px] grid-cols-[0.9fr_1.1fr_1.6fr_1fr_1fr_1.4fr_auto] items-center border-b border-[var(--color-border)] px-5 text-sm last:border-b-0 hover:bg-[var(--color-canvas)]"
            >
              <div className="truncate font-mono text-[12px] text-[var(--color-text-secondary)]" title={e.idTag}>{e.idTag}</div>
              <div className="truncate font-mono text-[13px] font-medium text-[var(--color-text-primary)]" title={e.serial}>{e.serial}</div>
              <div className="font-semibold">{e.name}</div>
              <div className="text-[var(--color-text-secondary)]">{e.category}</div>
              <div>
                <span
                  className="rounded-pill px-2.5 py-1 text-xs font-semibold"
                  style={{ background: st.bg, color: st.c }}
                >
                  {st.label}
                </span>
              </div>
              <div className="text-[13px]" style={{ color: noteColor }}>
                {note}
              </div>
              <div className="flex justify-start">
                <EquipmentRowActions
                  values={{ id: e.id, idTag: e.idTag, serial: e.serial, name: e.name, category: e.category, status: e.status, location: e.location, note: e.note }}
                  label={`${e.idTag} ${e.name}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
    </div>
  );
}
