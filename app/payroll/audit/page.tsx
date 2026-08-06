export const dynamic = "force-dynamic";

import { getAuditLog } from "@/lib/server/audit-log-data";

const EVENT_COLORS: Record<string, string> = {
  create: "var(--color-success-text)",
  update: "var(--color-info-text)",
  delete: "var(--color-danger-text)",
  approve: "var(--color-success-text)",
  reject: "var(--color-danger-text)",
  export: "var(--color-indigo-800)",
  release: "var(--color-success-text)",
  lock: "var(--color-text-muted)",
};

function dotColor(eventType: string): string {
  const key = eventType.toLowerCase().replace(/[^a-z]/g, "");
  for (const [k, v] of Object.entries(EVENT_COLORS)) {
    if (key.includes(k)) return v;
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

function extractDetail(entry: { event: string; entityType: string | null; entityId: string | null; metadata: Record<string, unknown> | null }) {
  const meta = entry.metadata ?? {};
  const ref = entry.entityId ?? "—";
  const prev = (meta.prev_value ?? meta.previous ?? meta.from ?? "—") as string;
  const next = (meta.next_value ?? meta.next ?? meta.to ?? "—") as string;
  const reason = (meta.reason ?? meta.note ?? "") as string;
  return { ref, prev: String(prev), next: String(next), reason: String(reason) };
}

export default async function PayrollAuditPage() {
  const allEntries = await getAuditLog();
  const entries = allEntries.filter(
    (e) =>
      (e.entityType ?? "").toLowerCase().includes("payroll") ||
      (e.eventType ?? "").toLowerCase().includes("payroll") ||
      (e.event ?? "").toLowerCase().includes("payroll") ||
      (e.event ?? "").toLowerCase().includes("salary") ||
      (e.event ?? "").toLowerCase().includes("attendance") ||
      (e.event ?? "").toLowerCase().includes("adjustment")
  );

  return (
    <div className="p-10 pb-14 pt-8">
      <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-ink-800)]">
        Audit log
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
        Immutable record of every payroll-affecting change — read-only
      </p>

      <div className="mt-6 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        {entries.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-[var(--color-text-muted)]">
            No payroll audit events recorded yet.
          </div>
        ) : (
          entries.map((e) => {
            const { ref, prev, next, reason } = extractDetail(e);
            return (
              <div key={e.id} className="flex flex-wrap items-start gap-3.5 border-b border-[var(--color-ink-100)] px-5 py-4 text-sm last:border-b-0">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: dotColor(e.eventType) }} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{e.event}</div>
                  <div className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                    {e.actorName}
                    {ref !== "—" && ` · ${ref}`}
                    {prev !== "—" && next !== "—" && ` · ${prev} → ${next}`}
                    {reason && ` · ${reason}`}
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
