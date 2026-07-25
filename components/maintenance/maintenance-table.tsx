import { Plus } from "lucide-react";
import { MAINTENANCE_ITEMS } from "@/lib/sample-data";

export function MaintenanceTable({ historyOnly }: { historyOnly: boolean }) {
  const rows = historyOnly ? MAINTENANCE_ITEMS.filter((m) => m.st === "completed") : MAINTENANCE_ITEMS;

  return (
    <div className="max-w-[1240px] p-12 pt-9">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-ink-800)]">
            {historyOnly ? "History" : "Maintenance"}
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            {historyOnly
              ? "Completed maintenance and repair work"
              : "Recurring studio & equipment upkeep — a staff task is raised as each item nears its due date"}
          </p>
        </div>
        <button className="flex h-10 shrink-0 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 font-display text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
          <Plus className="h-4 w-4" /> New item
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid h-11 grid-cols-[2.1fr_1fr_1.2fr_0.8fr_0.8fr_1.4fr] items-center bg-[var(--color-canvas)] px-5 text-[11px] font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
          <div>Item</div>
          <div>Type</div>
          <div>Assigned / vendor</div>
          <div>Next due</div>
          <div>Cost</div>
          <div>Status</div>
        </div>
        {rows.map((m) => (
          <div
            key={m.task}
            className="grid min-h-16 grid-cols-[2.1fr_1fr_1.2fr_0.8fr_0.8fr_1.4fr] items-center border-b border-[var(--color-ink-100)] px-5 text-[13px] last:border-b-0 hover:bg-[var(--color-canvas)]"
          >
            <div>
              <div className="font-semibold" style={{ color: m.stColor }}>
                {m.task}
              </div>
              <div className="text-xs text-[var(--color-text-muted)]">
                <span className="font-mono">{m.asset}</span> · {m.issue}
              </div>
              {m.taskRaised && (
                <span className="mt-1 inline-block rounded-pill bg-[var(--color-indigo-100)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-indigo-800)]">
                  ⚙ Staff task raised
                </span>
              )}
            </div>
            <div>
              <div className="text-[var(--color-ink-700)]">{m.mtype}</div>
              <div className="text-[11px] text-[var(--color-teal-800)]">↻ {m.recur}</div>
            </div>
            <div className="text-[var(--color-ink-700)]">{m.who}</div>
            <div className="text-xs text-[var(--color-ink-700)]">{m.next}</div>
            <div>
              <div className="text-xs text-[var(--color-ink-700)]">{m.est}</div>
              <div className="text-[11px] text-[var(--color-text-muted)]">{m.warranty}</div>
            </div>
            <div>
              <span
                className="rounded-pill px-2.5 py-1 text-[11px] font-semibold"
                style={{ background: m.stBg, color: m.stColor }}
              >
                {m.stL}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
