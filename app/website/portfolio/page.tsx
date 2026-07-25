import { Plus } from "lucide-react";
import { WEBSITE_PORTFOLIO } from "@/lib/sample-data";

export default function WebsitePortfolioPage() {
  return (
    <div className="max-w-[1200px] p-12 pt-9">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-ink-800)]">
            Portfolio
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            Curated by the studio — every piece needs a consent reference
          </p>
        </div>
        <button className="flex h-10 shrink-0 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 font-display text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
          <Plus className="h-4 w-4" /> Add work
        </button>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-[18px]">
        {WEBSITE_PORTFOLIO.map((p) => (
          <div
            key={p.slot}
            className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)]"
          >
            <div className="relative flex h-[150px] items-center justify-center bg-[var(--color-ink-100)] text-xs text-[var(--color-text-muted)]">
              Portfolio image
              <span
                className="absolute right-2.5 top-2.5 rounded-pill px-2.5 py-1 text-[11px] font-semibold"
                style={{ background: p.stBg, color: p.stColor }}
              >
                {p.stLabel}
              </span>
            </div>
            <div className="px-4 py-3.5">
              <div className="font-display text-base font-semibold">{p.title}</div>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[13px] text-[var(--color-text-secondary)]">{p.cat}</span>
                <span className="font-mono text-[11px] text-[var(--color-text-muted)]">{p.consentMono}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
