export const dynamic = "force-dynamic";

import { getRecruitmentRoles } from "@/lib/server/recruitment-data";

export default async function RecruitmentRolesPage() {
  const roles = await getRecruitmentRoles();

  return (
    <div className="max-w-[1000px] p-12 pt-9">
      <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
        Open roles
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
        Positions you&rsquo;re actively hiring for
      </p>

      <div className="mt-6 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        {roles.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-4 border-b border-[var(--color-border)] px-5 py-[18px] last:border-b-0"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold">{r.title}</div>
              <div className="mt-0.5 text-[13px] text-[var(--color-text-secondary)]">
                {r.type} · {r.applicantCount} applicant{r.applicantCount !== 1 ? "s" : ""}
              </div>
            </div>
            <span
              className="shrink-0 rounded-pill px-2.5 py-1 text-xs font-semibold"
              style={{
                background: r.isOpen ? "var(--color-success-bg)" : "var(--color-surface-muted)",
                color: r.isOpen ? "var(--color-success-text)" : "var(--color-text-secondary)",
              }}
            >
              {r.isOpen ? "Open" : "Draft"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
