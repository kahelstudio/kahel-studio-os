export const dynamic = "force-dynamic";

import { Plus } from "lucide-react";
import { getEquipment } from "@/lib/server/inventory-data";
import { OperationCreateButton } from "@/components/shared/operation-create-button";
import { EquipmentTable } from "@/components/inventory/equipment-table";

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
        <EquipmentTable equipment={equipment} />
      </div>
    </div>
  );
}
