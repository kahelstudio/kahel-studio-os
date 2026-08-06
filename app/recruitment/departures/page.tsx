import { Plus } from "lucide-react";
import { getDepartures } from "@/lib/server/recruitment-data";
import { OFFBOARDING_CHECKLIST } from "@/lib/sample-data";
import { ProgressList } from "@/components/recruitment/progress-list";
import type { ProgressPerson } from "@/components/recruitment/progress-list";

function computeProgress(done: number, total: number): Pick<ProgressPerson, "pct" | "label" | "barColor" | "stBg" | "stColor" | "stLabel"> {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const complete = done >= total;
  return {
    pct: `${pct}%`,
    label: `${done} / ${total}`,
    barColor: complete ? "#00A15C" : "var(--color-attention-text)",
    stBg: complete ? "var(--color-success-bg)" : "var(--color-attention-bg)",
    stColor: complete ? "var(--color-success-text)" : "var(--color-attention-text)",
    stLabel: complete ? "Complete" : "In progress",
  };
}

export default async function RecruitmentDeparturesPage() {
  const departures = await getDepartures();
  const people: ProgressPerson[] = departures.map((d) => ({
    ini: d.initials,
    name: d.name,
    role: d.role,
    ...computeProgress(d.tasksDone, d.tasksTotal),
  }));

  return (
    <div className="max-w-[1200px] p-12 pt-9">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
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
        people={people}
        checklist={OFFBOARDING_CHECKLIST}
        checklistOwner="D. LOPEZ"
      />
    </div>
  );
}
