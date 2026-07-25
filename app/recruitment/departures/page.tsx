import { Plus } from "lucide-react";
import { OFFBOARDING_CHECKLIST, OFFBOARDING_DEPARTURES } from "@/lib/sample-data";
import { ProgressList } from "@/components/recruitment/progress-list";

export default function RecruitmentDeparturesPage() {
  return (
    <div className="max-w-[1200px] p-12 pt-9">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-ink-800)]">
            Departures
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            Exit checklists, tracked to the final handover
          </p>
        </div>
        <button className="flex h-10 shrink-0 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 font-display text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
          <Plus className="h-4 w-4" /> Start offboarding
        </button>
      </div>

      <ProgressList
        title="Checklist"
        people={OFFBOARDING_DEPARTURES}
        checklist={OFFBOARDING_CHECKLIST}
        checklistOwner="D. LOPEZ"
      />
    </div>
  );
}
