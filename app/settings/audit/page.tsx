export const dynamic = "force-dynamic";

import { getAuditLog } from "@/lib/server/audit-log-data";

const EVENT_DOT: Record<string, string> = {
  create: "var(--color-success-text)",
  invite: "var(--color-info-text)",
  update: "var(--color-info-text)",
  change: "var(--color-kahel-500)",
  delete: "var(--color-danger-text)",
  remove: "var(--color-danger-text)",
  enable: "var(--color-success-text)",
  disable: "var(--color-danger-text)",
  export: "var(--color-indigo-800)",
  connect: "var(--color-success-text)",
};

function dotColor(event: string): string {
  const lower = event.toLowerCase();
  for (const [k, v] of Object.entries(EVENT_DOT)) {
    if (lower.includes(k)) return v;
  }
  return "var(--color-info-text)";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-PH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

const PAYROLL_KEYWORDS = ["payroll", "salary", "payslip", "adjustment", "attendance import", "contribution"];

export default async function SettingsAuditPage() {
  const allEntries = await getAuditLog();
  const entries = allEntries.filter((e) => {
    const text = `${e.event} ${e.eventType} ${e.entityType ?? ""}`.toLowerCase();
    return !PAYROLL_KEYWORDS.some((kw) => text.includes(kw));
  });

  return (
    <div className="max-w-[820px] p-12 pt-9">
      <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
        Audit log
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
        Immutable record of workspace-level changes — security events, permission updates, billing and settings changes
      </p>

      <div className="mt-6 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        {entries.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-[var(--color-text-muted)]">
            No workspace audit events recorded yet.
          </div>
        ) : (
          entries.map((e) => {
            const meta = e.metadata ?? {};
            const target = (meta.target ?? meta.entity_name ?? e.entityId ?? "") as string;
            const detail = (meta.detail ?? meta.note ?? meta.reason ?? "") as string;
            return (
              <div key={e.id} className="flex flex-wrap items-start gap-3.5 border-b border-[var(--color-border)] px-5 py-4 text-sm last:border-b-0">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: dotColor(e.event) }} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{e.event}</div>
                  <div className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                    {e.actorName}
                    {target && ` · ${target}`}
                    {detail && ` · ${detail}`}
                  </div>
                </div>
                <span className="shrink-0 text-xs text-[var(--color-text-muted)]">{formatDate(e.createdAt)}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
