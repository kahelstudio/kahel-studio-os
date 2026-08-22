import { TriangleAlert } from "lucide-react";

export default function InventoryCheckoutsPage() {
  return (
    <div className="max-w-[1000px]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] pb-9 pt-[34px] px-4 sm:px-6">
      <h1 className="font-display text-[clamp(1.8rem,4vw,2.25rem)] font-semibold leading-11 tracking-[-0.025em] text-[var(--color-text-primary)]">
        Checkouts
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">Who has what, and when it clashes</p>
      </header>

      <div className="px-4 sm:px-6 pb-12">
      <div className="mt-6 flex items-center gap-3 rounded-card border border-[#FADBB0] bg-[var(--color-kahel-50)] px-5 py-4">
        <TriangleAlert className="h-4 w-4 shrink-0 text-[var(--color-kahel-700)]" strokeWidth={1.75} />
        <div className="text-sm">
          <span className="font-semibold text-[var(--color-kahel-700)]">1 conflict</span>{" "}
          <span className="text-[var(--color-text-secondary)]">
            — R5 body #01 is double-booked 23 Jul (Ayala return vs Reyes shoot)
          </span>
        </div>
        <button className="ml-auto h-[34px] shrink-0 rounded-control border border-[#FCE6D3] bg-[var(--color-surface)] px-3.5 text-[13px] font-semibold text-[var(--color-kahel-700)]">
          Resolve
        </button>
      </div>
    </div>
    </div>
  );
}
