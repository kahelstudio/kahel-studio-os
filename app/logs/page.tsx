import { Download } from "lucide-react";
import { SETTINGS_LOGS } from "@/lib/sample-data";

export default function LogsPage() {
  return (
    <div className="max-w-[1000px] p-12 pt-9">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-ink-800)]">
            Logs
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            System activity across the workspace — read-only
          </p>
        </div>
        <button className="flex h-10 shrink-0 items-center gap-1.5 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-semibold text-[var(--color-text-primary)]">
          <Download className="h-4 w-4" /> Export
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid h-11 grid-cols-[2fr_1.3fr_1fr_1.2fr] items-center bg-[var(--color-canvas)] px-5 text-[11px] font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
          <div>Event</div>
          <div>Actor</div>
          <div>Type</div>
          <div>When</div>
        </div>
        {SETTINGS_LOGS.map((r, i) => (
          <div
            key={i}
            className="grid h-[54px] grid-cols-[2fr_1.3fr_1fr_1.2fr] items-center border-b border-[var(--color-ink-100)] px-5 text-sm last:border-b-0"
          >
            <div className="font-medium">{r.ev}</div>
            <div className="text-[var(--color-text-secondary)]">{r.actor}</div>
            <div>
              <span
                className="rounded-pill px-2.5 py-1 text-[11px] font-semibold"
                style={{ background: r.tBg, color: r.tColor }}
              >
                {r.tL}
              </span>
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">{r.when}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
