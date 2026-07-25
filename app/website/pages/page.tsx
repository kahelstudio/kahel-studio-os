import { WEBSITE_PAGES } from "@/lib/sample-data";

export default function WebsitePagesPage() {
  return (
    <div className="max-w-[1000px] p-12 pt-9">
      <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-ink-800)]">
        Pages
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">Content for kahelstudio.com</p>

      <div className="mt-6 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        {WEBSITE_PAGES.map((p) => (
          <div
            key={p.path}
            className="flex items-center gap-3.5 border-b border-[var(--color-ink-100)] px-5 py-[15px] text-sm last:border-b-0"
          >
            <span className="w-[150px] font-mono text-[13px] text-[var(--color-text-secondary)]">{p.path}</span>
            <span className="font-semibold">{p.title}</span>
            <span
              className="ml-auto rounded-pill px-2.5 py-1 text-xs font-semibold"
              style={{ background: p.stBg, color: p.stColor }}
            >
              {p.stLabel}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
