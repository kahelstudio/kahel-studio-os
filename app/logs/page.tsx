export const dynamic = "force-dynamic";

import { Download } from "lucide-react";
import { getAuditLog } from "@/lib/server/audit-log-data";

const TYPE_STYLES: Record<string, { bg: string; c: string }> = {
  auth: { bg: "var(--color-indigo-100)", c: "var(--color-indigo-800)" },
  action: { bg: "var(--color-success-bg)", c: "var(--color-success-text)" },
  data: { bg: "var(--color-info-bg)", c: "var(--color-info-text)" },
  security: { bg: "var(--color-warning-bg)", c: "var(--color-warning-text)" },
  warn: { bg: "var(--color-warning-bg)", c: "var(--color-warning-text)" },
};

function fmtWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default async function LogsPage() {
  const entries = await getAuditLog();

  return (
    <div className="app-page p-5 pb-14 sm:p-8 lg:p-10">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
            Logs
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            System activity across the workspace — read-only
          </p>
        </div>
        <a href="/api/logs/export" className="flex h-10 shrink-0 items-center gap-1.5 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-semibold text-[var(--color-text-primary)]">
          <Download className="h-4 w-4" /> Export
        </a>
      </div>

      <div className="mt-6 overflow-x-auto rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid h-11 min-w-[760px] grid-cols-[2fr_1.3fr_1fr_1.2fr] items-center bg-[var(--color-canvas)] px-5 text-[11px] font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
          <div>Event</div>
          <div>Actor</div>
          <div>Type</div>
          <div>When</div>
        </div>
        {entries.map((e) => {
          const st = TYPE_STYLES[e.eventType] ?? TYPE_STYLES.data;
          return (
            <div
              key={e.id}
              className="grid h-[54px] min-w-[760px] grid-cols-[2fr_1.3fr_1fr_1.2fr] items-center border-b border-[var(--color-border)] px-5 text-sm last:border-b-0"
            >
              <div className="font-medium">{e.event}</div>
              <div className="text-[var(--color-text-secondary)]">{e.actorName}</div>
              <div>
                <span
                  className="rounded-pill px-2.5 py-1 text-[11px] font-semibold"
                  style={{ background: st.bg, color: st.c }}
                >
                  {e.eventType.charAt(0).toUpperCase() + e.eventType.slice(1)}
                </span>
              </div>
              <div className="text-xs text-[var(--color-text-muted)]">{fmtWhen(e.createdAt)}</div>
            </div>
          );
        })}
        {entries.length === 0 && <div className="px-5 py-12 text-center text-sm text-[var(--color-text-muted)]">No workspace activity has been recorded yet.</div>}
      </div>
    </div>
  );
}
