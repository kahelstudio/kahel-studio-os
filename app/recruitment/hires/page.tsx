export const dynamic = "force-dynamic";

import { Plus } from "lucide-react";
import { getHires } from "@/lib/server/recruitment-data";
import { ONBOARDING_CHECKLIST } from "@/lib/sample-data";
import { ProgressList } from "@/components/recruitment/progress-list";
import type { ProgressPerson } from "@/components/recruitment/progress-list";
import { OperationCreateButton } from "@/components/shared/operation-create-button";

function computeProgress(done: number, total: number): Pick<ProgressPerson, "pct" | "label" | "barColor" | "stBg" | "stColor" | "stLabel"> {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const complete = done >= total;
  return {
    pct: `${pct}%`,
    label: `${done} / ${total}`,
    barColor: complete ? "#00A15C" : "#4F3DD9",
    stBg: complete ? "var(--color-success-bg)" : "var(--color-indigo-100)",
    stColor: complete ? "var(--color-success-text)" : "var(--color-indigo-800)",
    stLabel: complete ? "Complete" : "In progress",
  };
}

export default async function RecruitmentHiresPage() {
  const hires = await getHires();
  const people: ProgressPerson[] = hires.map((h) => ({
    ini: h.initials,
    name: h.name,
    role: h.role,
    ...computeProgress(h.tasksDone, h.tasksTotal),
  }));

  return (
    <div className="max-w-[1200px]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] pb-9 pt-[34px] px-4 sm:px-6 flex items-end justify-between">
        <div>
          <h1 className="font-display text-[clamp(1.8rem,4vw,2.25rem)] font-semibold leading-11 tracking-[-0.025em] text-[var(--color-text-primary)]">
            New hires
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            Every checklist, tracked to the last signature
          </p>
        </div>
        <OperationCreateButton kind="onboarding" className="flex h-10 shrink-0 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 font-display text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
          <Plus className="h-4 w-4" /> Start onboarding
        </OperationCreateButton>
      </header>

      <div className="px-4 sm:px-6 pb-12">
      <ProgressList
        title="Checklist"
        people={people}
        checklist={ONBOARDING_CHECKLIST}
        checklistOwner="M. PADUA"
      />
      </div>
    </div>
  );
}
