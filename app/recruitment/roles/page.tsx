import { RECRUITMENT_ROLES } from "@/lib/sample-data";

export default function RecruitmentRolesPage() {
  return (
    <div className="max-w-[1000px] p-12 pt-9">
      <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
        Open roles
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
        Positions you&rsquo;re actively hiring for
      </p>

      <div className="mt-6 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        {RECRUITMENT_ROLES.map((r) => (
          <div
            key={r.title}
            className="flex items-center gap-4 border-b border-[var(--color-border)] px-5 py-[18px] last:border-b-0"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold">{r.title}</div>
              <div className="mt-0.5 text-[13px] text-[var(--color-text-secondary)]">
                {r.type} · {r.applicants}
              </div>
            </div>
            <span
              className="shrink-0 rounded-pill px-2.5 py-1 text-xs font-semibold"
              style={{ background: r.stBg, color: r.stColor }}
            >
              {r.stLabel}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
