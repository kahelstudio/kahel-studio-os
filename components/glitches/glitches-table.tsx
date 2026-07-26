import { Plus } from "lucide-react";
import { GLITCHES } from "@/lib/sample-data";

export function GlitchesTable({ group }: { group: "open" | "closed" }) {
  const rows = GLITCHES.filter((g) => g.group === group);

  return (
    <div className="p-12 pt-9">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
            Glitches
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            Production issues and bug reports across the workspace
          </p>
        </div>
        <button className="flex h-10 shrink-0 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 font-display text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
          <Plus className="h-4 w-4" /> Report glitch
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid h-11 grid-cols-[0.8fr_2fr_1fr_0.7fr_0.9fr_1fr] items-center bg-[var(--color-canvas)] px-5 text-[11px] font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
          <div>Ref</div>
          <div>Issue</div>
          <div>Reported by</div>
          <div>Severity</div>
          <div>Status</div>
          <div className="text-right">Logged</div>
        </div>
        {rows.map((g) => (
          <div
            key={g.ref}
            className="grid min-h-[58px] grid-cols-[0.8fr_2fr_1fr_0.7fr_0.9fr_1fr] items-center border-b border-[var(--color-border)] px-5 text-[13px] last:border-b-0 hover:bg-[var(--color-canvas)]"
          >
            <div className="text-xs text-[var(--color-text-muted)]">{g.ref}</div>
            <div>
              <div className="font-semibold">{g.title}</div>
              <div className="text-xs text-[var(--color-text-muted)]">{g.area}</div>
            </div>
            <div className="text-[var(--color-text-primary)]">{g.by}</div>
            <div className="font-semibold" style={{ color: g.sevColor }}>
              {g.sev}
            </div>
            <div>
              <span
                className="rounded-pill px-2.5 py-1 text-[11px] font-semibold"
                style={{ background: g.stBg, color: g.stColor }}
              >
                {g.stL}
              </span>
            </div>
            <div className="text-right text-xs text-[var(--color-text-muted)]">{g.when}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
