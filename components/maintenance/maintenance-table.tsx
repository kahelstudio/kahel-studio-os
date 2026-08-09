import { Plus } from "lucide-react";
import type { MaintenanceRecord } from "@/lib/server/maintenance-data";
import { OperationCreateButton } from "@/components/shared/operation-create-button";

const STATUS_STYLES: Record<string, { bg: string; c: string; l: string }> = {
  reported: { bg: "var(--color-danger-bg)", c: "var(--color-danger-text)", l: "Reported" },
  inspect: { bg: "var(--color-warning-bg)", c: "var(--color-warning-text)", l: "Inspection required" },
  scheduled: { bg: "var(--color-info-bg)", c: "var(--color-info-text)", l: "Scheduled" },
  inrepair: { bg: "var(--color-attention-bg)", c: "var(--color-attention-text)", l: "In repair" },
  awaiting: { bg: "var(--color-warning-bg)", c: "var(--color-warning-text)", l: "Awaiting parts" },
  completed: { bg: "var(--color-success-bg)", c: "var(--color-success-text)", l: "Completed" },
  unrepairable: { bg: "var(--color-surface-muted)", c: "var(--color-text-primary)", l: "Unrepairable" },
};

const TASK_RAISED_STATUSES = ["reported", "inspect", "scheduled", "inrepair", "awaiting"];

export function MaintenanceTable({
  rows,
  historyOnly,
}: {
  rows: MaintenanceRecord[];
  historyOnly: boolean;
}) {
  return (
    <div className="p-12 pt-9">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
            {historyOnly ? "History" : "Maintenance"}
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            {historyOnly
              ? "Completed maintenance and repair work"
              : "Recurring studio & equipment upkeep — a staff task is raised as each item nears its due date"}
          </p>
        </div>
        <OperationCreateButton kind="maintenance" defaults={{ status: historyOnly ? "completed" : "reported" }} className="flex h-10 shrink-0 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 font-display text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
          <Plus className="h-4 w-4" /> New item
        </OperationCreateButton>
      </div>

      <div className="mt-6 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid h-12 grid-cols-[2.1fr_1fr_1.2fr_0.8fr_0.8fr_1.4fr] items-center bg-[var(--color-canvas)] px-5 text-[11px] font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
          <div>Item</div>
          <div>Type</div>
          <div>Assigned / vendor</div>
          <div>Next due</div>
          <div>Cost</div>
          <div>Status</div>
        </div>
        {rows.map((m) => {
          const st = STATUS_STYLES[m.status] ?? STATUS_STYLES.scheduled;
          return (
            <div
              key={m.id}
              className="grid min-h-[84px] grid-cols-[2.1fr_1fr_1.2fr_0.8fr_0.8fr_1.4fr] items-center border-b border-[var(--color-border)] px-5 py-4 text-[13px] last:border-b-0 hover:bg-[var(--color-canvas)]"
            >
              <div>
                <div className="font-semibold" style={{ color: st.c }}>
                  {m.task}
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  <span>{m.assetLabel}</span>{m.issue ? <> · {m.issue}</> : null}
                </div>
                {TASK_RAISED_STATUSES.includes(m.status) && (
                  <span className="mt-1 inline-block rounded-pill bg-[var(--color-indigo-100)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-indigo-800)]">
                    ⚙ Staff task raised
                  </span>
                )}
              </div>
              <div>
                <div className="text-[var(--color-text-primary)]">{m.maintenanceType}</div>
                {m.recurrence && (
                  <div className="text-[11px] text-[var(--color-teal-800)]">↻ {m.recurrence}</div>
                )}
              </div>
              <div className="text-[var(--color-text-primary)]">{m.assignee}</div>
              <div className="text-xs text-[var(--color-text-primary)]">{m.nextDue ?? "—"}</div>
              <div>
                <div className="text-xs text-[var(--color-text-primary)]">
                  {m.estimatedCost != null ? `₱${m.estimatedCost.toLocaleString("en-PH")}` : "₱0"}
                </div>
                <div className="text-[11px] text-[var(--color-text-muted)]">{m.warranty ?? "N/A"}</div>
              </div>
              <div>
                <span
                  className="rounded-pill px-2.5 py-1 text-[11px] font-semibold"
                  style={{ background: st.bg, color: st.c }}
                >
                  {st.l}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
