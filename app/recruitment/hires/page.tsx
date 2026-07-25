import { Plus } from "lucide-react";
import { ONBOARDING_CHECKLIST, ONBOARDING_HIRES } from "@/lib/sample-data";
import { ProgressList } from "@/components/recruitment/progress-list";

export default function RecruitmentHiresPage() {
  return (
    <div className="max-w-[1200px] p-12 pt-9">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-ink-800)]">
            New hires
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            Every checklist, tracked to the last signature
          </p>
        </div>
        <button className="flex h-10 shrink-0 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 font-display text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
          <Plus className="h-4 w-4" /> Start onboarding
        </button>
      </div>

      <ProgressList
        title="Checklist"
        people={ONBOARDING_HIRES}
        checklist={ONBOARDING_CHECKLIST}
        checklistOwner="M. PADUA"
      />
    </div>
  );
}
