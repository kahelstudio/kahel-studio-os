"use client";

import { useState } from "react";

type Status = "waiting" | "notified" | "converted" | "expired" | "cancelled";

export function WaitlistRowActions({ id, status, onUpdate }: { id: string; status: Status; onUpdate: (id: string, newStatus: Status) => void }) {
  const [pending, setPending] = useState(false);

  async function notify() {
    if (!confirm("Send 'slot available' email to this client and mark as notified?")) return;
    setPending(true);
    const response = await fetch(`/api/waitlist/${id}/notify`, { method: "POST" });
    setPending(false);
    if (response.ok) onUpdate(id, "notified");
    else alert("Could not notify. Please try again.");
  }

  async function cancel(newStatus: "cancelled" | "expired") {
    if (!confirm(`Mark this entry as ${newStatus}?`)) return;
    setPending(true);
    const response = await fetch(`/api/waitlist/${id}/cancel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
    setPending(false);
    if (response.ok) onUpdate(id, newStatus);
    else alert("Could not update. Please try again.");
  }

  if (status === "waiting") {
    return (
      <span className="flex items-center gap-2">
        <button
          disabled={pending}
          onClick={notify}
          className="inline-flex h-8 items-center rounded-control bg-[var(--color-kahel-500)] px-3 text-xs font-semibold text-white hover:bg-[var(--color-kahel-600)] disabled:opacity-50"
        >
          Slot available
        </button>
        <button
          disabled={pending}
          onClick={() => cancel("cancelled")}
          className="inline-flex h-8 items-center rounded-control border border-[var(--color-border)] px-3 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
        >
          Cancel
        </button>
      </span>
    );
  }

  if (status === "notified") {
    return (
      <span className="flex items-center gap-2">
        <span className="text-xs text-[var(--color-text-muted)]">Email sent</span>
        <button
          disabled={pending}
          onClick={() => cancel("expired")}
          className="inline-flex h-8 items-center rounded-control border border-[var(--color-border)] px-3 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
        >
          Expire
        </button>
      </span>
    );
  }

  return null;
}

export function WaitlistTable({ initialRows }: { initialRows: Array<{
  id: string; name: string; email: string; phone: string | null;
  serviceName: string | null; preferredStart: string; preferredEnd: string;
  timeOfDay: string; status: Status; createdAt: string; notifiedAt: string | null;
}> }) {
  const [rows, setRows] = useState(initialRows);

  function handleUpdate(id: string, newStatus: Status) {
    setRows((current) => current.map((r) => r.id === id ? { ...r, status: newStatus, notifiedAt: newStatus === "notified" ? new Date().toISOString() : r.notifiedAt } : r));
  }

  const STATUS_LABEL: Record<Status, string> = {
    waiting: "Waiting",
    notified: "Notified",
    converted: "Converted",
    expired: "Expired",
    cancelled: "Cancelled",
  };

  const STATUS_STYLE: Record<Status, { bg: string; color: string }> = {
    waiting: { bg: "var(--color-attention-bg)", color: "var(--color-attention-text)" },
    notified: { bg: "var(--color-info-bg)", color: "var(--color-info-text)" },
    converted: { bg: "var(--color-success-bg)", color: "var(--color-success-text)" },
    expired: { bg: "var(--color-surface-muted)", color: "var(--color-text-secondary)" },
    cancelled: { bg: "var(--color-danger-bg)", color: "var(--color-danger-text)" },
  };

  function fmt(iso: string) {
    return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
  }

  function window(start: string, end: string) {
    if (start === end) return fmt(start);
    const s = new Date(start).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
    return `${s} – ${fmt(end)}`;
  }

  return (
    <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="grid h-11 grid-cols-[1.6fr_1.6fr_1.2fr_1.4fr_1fr_1fr_1.8fr] items-center bg-[var(--color-canvas)] px-5 text-[11px] font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
        <div>Client</div>
        <div>Email</div>
        <div>Session</div>
        <div>Preferred window</div>
        <div>Time</div>
        <div>Status</div>
        <div>Actions</div>
      </div>
      {rows.map((r) => {
        const st = STATUS_STYLE[r.status];
        return (
          <div
            key={r.id}
            className="grid min-h-[52px] grid-cols-[1.6fr_1.6fr_1.2fr_1.4fr_1fr_1fr_1.8fr] items-center border-t border-[var(--color-border)] px-5 py-3 text-sm"
          >
            <div>
              <div className="font-semibold">{r.name}</div>
              {r.phone && <div className="text-xs text-[var(--color-text-muted)]">{r.phone}</div>}
            </div>
            <div className="truncate text-[var(--color-text-secondary)]">{r.email}</div>
            <div className="text-[var(--color-text-secondary)]">{r.serviceName ?? "Any"}</div>
            <div className="text-[13px] text-[var(--color-text-primary)]">
              <div>{window(r.preferredStart, r.preferredEnd)}</div>
              <div className="text-xs capitalize text-[var(--color-text-muted)]">{r.timeOfDay}</div>
            </div>
            <div className="capitalize text-[13px] text-[var(--color-text-secondary)]">{r.timeOfDay}</div>
            <div>
              <span className="rounded-pill px-2.5 py-1 text-[11px] font-semibold" style={{ background: st.bg, color: st.color }}>
                {STATUS_LABEL[r.status]}
              </span>
            </div>
            <div>
              <WaitlistRowActions id={r.id} status={r.status} onUpdate={handleUpdate} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
