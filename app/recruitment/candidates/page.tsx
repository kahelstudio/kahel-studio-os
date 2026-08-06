export const dynamic = "force-dynamic";

import { Plus } from "lucide-react";
import { getRecruitmentCandidates } from "@/lib/server/recruitment-data";

const REC_STAGES: Record<string, { label: string; bg: string; c: string }> = {
  applied: { label: "Applied", bg: "var(--color-surface-muted)", c: "var(--color-text-secondary)" },
  screening: { label: "Screening", bg: "var(--color-info-bg)", c: "var(--color-info-text)" },
  interview: { label: "Interview", bg: "var(--color-attention-bg)", c: "var(--color-attention-text)" },
  offer: { label: "Offer", bg: "var(--color-success-bg)", c: "var(--color-success-text)" },
};

export default async function RecruitmentCandidatesPage() {
  const candidates = await getRecruitmentCandidates();

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
        {candidates.map((c) => {
          const st = REC_STAGES[c.stage] ?? REC_STAGES.applied;
          const role = c.roleTitle ?? c.roleApplied;
          const meta = [c.source, c.notes].filter(Boolean).join(" · ") || "—";
          return (
            <div
              key={c.id}
              className="flex items-center gap-3.5 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-[18px] hover:border-[var(--color-border-strong)]"
            >
              <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-[var(--color-indigo-100)] font-display text-sm font-semibold text-[var(--color-indigo-800)]">
                {c.initials}
              </div>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold">{c.name}</div>
                <div className="text-[13px] text-[var(--color-text-secondary)]">
                  {role} · {meta}
                </div>
              </div>
              <span
                className="ml-auto shrink-0 rounded-pill px-2.5 py-1 text-xs font-semibold"
                style={{ background: st.bg, color: st.c }}
              >
                {st.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
