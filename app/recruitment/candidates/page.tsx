import { Plus } from "lucide-react";
import { RECRUITMENT_CANDIDATES } from "@/lib/sample-data";

export default function RecruitmentCandidatesPage() {
  return (
    <div className="max-w-[1200px] p-12 pt-9">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
            Candidates
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            Everyone in the hiring pipeline right now
          </p>
        </div>
        <button className="flex h-10 shrink-0 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 font-display text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
          <Plus className="h-4 w-4" /> Add candidate
        </button>
      </div>

      <div className="mt-[26px] flex flex-col gap-3.5">
        {RECRUITMENT_CANDIDATES.map((c) => (
          <div
            key={c.name}
            className="flex items-center gap-3.5 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-[18px] hover:border-[var(--color-border-strong)]"
          >
            <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-[var(--color-indigo-100)] font-display text-sm font-semibold text-[var(--color-indigo-800)]">
              {c.ini}
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-semibold">{c.name}</div>
              <div className="text-[13px] text-[var(--color-text-secondary)]">
                {c.role} · {c.meta}
              </div>
            </div>
            <span
              className="ml-auto shrink-0 rounded-pill px-2.5 py-1 text-xs font-semibold"
              style={{ background: c.stBg, color: c.stColor }}
            >
              {c.stLabel}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
