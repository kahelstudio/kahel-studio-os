export const dynamic = "force-dynamic";

import { getPages } from "@/lib/server/website-data";

const WEB_STATUS: Record<string, { bg: string; c: string; label: string }> = {
  published: { bg: "var(--color-success-bg)", c: "var(--color-success-text)", label: "Published" },
  draft: { bg: "var(--color-surface-muted)", c: "var(--color-text-secondary)", label: "Draft" },
};

export default async function WebsitePagesPage() {
  const pages = await getPages();

  return (
    <div className="max-w-[1000px] p-12 pt-9">
      <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
        Pages
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">Content for kahelstudio.com</p>

      <div className="mt-6 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        {pages.map((p) => {
          const st = WEB_STATUS[p.status] ?? WEB_STATUS.draft;
          return (
            <div
              key={p.id}
              className="flex items-center gap-3.5 border-b border-[var(--color-border)] px-5 py-[15px] text-sm last:border-b-0"
            >
              <span className="w-[150px] text-[13px] text-[var(--color-text-secondary)]">—</span>
              <span className="font-semibold">{p.title}</span>
              <span
                className="ml-auto rounded-pill px-2.5 py-1 text-xs font-semibold"
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
