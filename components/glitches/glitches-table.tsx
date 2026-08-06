import { Plus } from "lucide-react";
import type { GlitchRow } from "@/lib/server/glitches-data";

const GLITCH_ST: Record<string, { bg: string; c: string; l: string }> = {
  open: { bg: "var(--color-danger-bg)", c: "var(--color-danger-text)", l: "Open" },
  progress: { bg: "var(--color-warning-bg)", c: "var(--color-warning-text)", l: "Investigating" },
  fixed: { bg: "var(--color-success-bg)", c: "var(--color-success-text)", l: "Fixed" },
  closed: { bg: "var(--color-surface-muted)", c: "var(--color-text-primary)", l: "Closed" },
};

const SEV_COLOR: Record<string, string> = {
  High: "var(--color-danger-text)",
  Medium: "var(--color-warning-text)",
  Low: "var(--color-text-secondary)",
};

function formatReportedAt(iso: string): string {
  const d = new Date(iso);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const hours = d.getHours();
  const mins = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const h = hours % 12 || 12;
  return `${day} ${month} · ${h}:${mins} ${ampm}`;
}

export function GlitchesTable({ group, glitches }: { group: "open" | "closed"; glitches: GlitchRow[] }) {
  const statusFilter = group === "open" ? ["open", "progress"] : ["fixed", "closed"];
  const rows = glitches.filter((g) => statusFilter.includes(g.status));

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
        {rows.map((g) => {
          const st = GLITCH_ST[g.status] ?? GLITCH_ST.open;
          const sevColor = SEV_COLOR[g.severity] ?? "var(--color-text-secondary)";
          return (
            <div
              key={g.reference}
              className="grid min-h-[58px] grid-cols-[0.8fr_2fr_1fr_0.7fr_0.9fr_1fr] items-center border-b border-[var(--color-border)] px-5 text-[13px] last:border-b-0 hover:bg-[var(--color-canvas)]"
            >
              <div className="text-xs text-[var(--color-text-muted)]">{g.reference}</div>
              <div>
                <div className="font-semibold">{g.title}</div>
                <div className="text-xs text-[var(--color-text-muted)]">{g.area}</div>
              </div>
              <div className="text-[var(--color-text-primary)]">{g.reporter}</div>
              <div className="font-semibold" style={{ color: sevColor }}>
                {g.severity}
              </div>
              <div>
                <span
                  className="rounded-pill px-2.5 py-1 text-[11px] font-semibold"
                  style={{ background: st.bg, color: st.c }}
                >
                  {st.l}
                </span>
              </div>
              <div className="text-right text-xs text-[var(--color-text-muted)]">{formatReportedAt(g.reportedAt)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
