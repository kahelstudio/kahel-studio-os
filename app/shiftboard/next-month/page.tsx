"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { OperationCreateButton } from "@/components/shared/operation-create-button";
import { FutureShifts } from "@/components/shiftboard/future-shifts";

const LEGEND = [
  { label: "Studio Shoot", color: "#F2383A" },
  { label: "Event", color: "#8A4BE3" },
  { label: "Editing / Post", color: "#F6A21A" },
  { label: "Admin / Office", color: "#16A34A" },
  { label: "Production Support", color: "#0EA5A8" },
  { label: "Day Off", color: "#CECBC5" },
  { label: "Remote Work", color: "#3B82C4" },
] as const;

export default function ShiftboardNextMonthPage() {
  const [view, setView] = useState<"shift" | "production">("shift");

  return (
    <div className="p-12 pt-9">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
            Next Month
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            Studio coverage and crew shifts looking ahead
          </p>
        </div>
        <OperationCreateButton kind="shift" className="flex h-10 shrink-0 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 font-display text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
          <Plus className="h-4 w-4" /> New shift
        </OperationCreateButton>
      </div>

      <div className="mt-5 flex items-center gap-1.5 rounded-control bg-[var(--color-surface-muted)] p-1 w-fit">
        {(["shift", "production"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className={cn("h-8 rounded-[6px] px-3 text-xs font-semibold", v === view ? "bg-[var(--color-surface)] text-[var(--color-kahel-700)] shadow-sm" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]")}>
            {v === "shift" ? "Shift View" : "Production View"}
          </button>
        ))}
      </div>

      <FutureShifts mode="month" />

      <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-[var(--color-border)] pt-4">
        <span className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">Legend</span>
        {LEGEND.map((l) => (
          <span key={l.label} className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: l.color }} /> {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
