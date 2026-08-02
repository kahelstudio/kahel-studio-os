"use client";

import {
  AlertCircle,
  Clock3,
  Gift,
  History,
  RefreshCw,
  TicketCheck,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/toast/toast-provider";

type JsonRecord = Record<string, unknown>;

interface LoyaltyResponse extends JsonRecord {
  linked?: boolean;
  permissions?: string[];
  summary?: JsonRecord;
  balances?: JsonRecord;
  excludedBookings?: JsonRecord[];
  rewardBookings?: JsonRecord[];
  emails?: JsonRecord[];
  emailStatuses?: JsonRecord[];
  history?: JsonRecord[];
  activity?: JsonRecord[];
  termsVersion?: string | null;
  client?: unknown;
  loyaltyAccount?: unknown;
}

type ActionName =
  | "issue"
  | "correct_progress"
  | "exclude_booking"
  | "restore_booking"
  | "cancel_reward"
  | "reinstate_reward"
  | "redeem_reward"
  | "resend";

interface PendingAction {
  action: ActionName;
  title: string;
  description: string;
  confirmLabel: string;
  targetId?: string;
  valueLabel?: string;
  initialValue?: string;
}

const ACTION_PERMISSION: Record<ActionName, string[]> = {
  issue: ["issue", "loyalty.issue"],
  correct_progress: ["correct_progress", "progress_correction", "loyalty.correct_progress"],
  exclude_booking: ["exclude_booking", "booking_exclude", "loyalty.exclude_booking"],
  restore_booking: ["restore_booking", "booking_restore", "loyalty.restore_booking"],
  cancel_reward: ["cancel_reward", "reward_cancel", "loyalty.cancel_reward"],
  reinstate_reward: ["reinstate_reward", "reward_reinstate", "loyalty.reinstate_reward"],
  redeem_reward: ["redeem_reward", "reward_redeem", "loyalty.redeem_reward"],
  resend: ["resend", "loyalty.resend"],
};

function value(record: JsonRecord | undefined, ...keys: string[]) {
  for (const key of keys) {
    const found = record?.[key];
    if (found !== undefined && found !== null && found !== "") return found;
  }
  return undefined;
}

function text(record: JsonRecord | undefined, ...keys: string[]) {
  const found = value(record, ...keys);
  return found === undefined ? undefined : String(found);
}

function count(record: JsonRecord | undefined, ...keys: string[]) {
  const found = Number(value(record, ...keys));
  return Number.isFinite(found) ? found : 0;
}

function identifier(record: JsonRecord) {
  return text(record, "id", "bookingId", "rewardId", "emailId", "ref");
}

function formatDate(input: unknown) {
  if (!input) return "Date unavailable";
  const date = new Date(String(input));
  if (Number.isNaN(date.getTime())) return String(input);
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function rewardStatus(status: string | undefined) {
  switch (status?.toLowerCase()) {
    case "available":
    case "issued":
      return "Available reward";
    case "reserved":
      return "Reserved reward";
    case "redeemed":
      return "Redeemed reward";
    case "cancelled":
    case "canceled":
      return "Cancelled reward";
    case "reinstated":
      return "Reinstated reward";
    case "expired":
      return "Expired reward";
    default:
      return "Unknown reward status";
  }
}

function statusTone(status: string | undefined) {
  switch (status?.toLowerCase()) {
    case "sent":
    case "delivered":
    case "redeemed":
    case "available":
    case "issued":
    case "reinstated":
      return "bg-[var(--color-success-bg)] text-[var(--color-success-text)]";
    case "failed":
    case "cancelled":
    case "canceled":
    case "expired":
      return "bg-[var(--color-danger-bg)] text-[var(--color-danger)]";
    default:
      return "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]";
  }
}

export function LoyaltyAdminPanel({ clientRef }: { clientRef: string }) {
  const { fireToast } = useToast();
  const [data, setData] = useState<LoyaltyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/loyalty/admin/clients/${encodeURIComponent(clientRef)}`,
          { signal: controller.signal },
        );
        const body = (await response.json().catch(() => null)) as LoyaltyResponse | null;
        if (!response.ok) {
          throw new Error(text(body ?? undefined, "error", "message") ?? "Unable to load loyalty details.");
        }
        setData(body ?? {});
      } catch (loadError) {
        if ((loadError as Error).name !== "AbortError") {
          setError(loadError instanceof Error ? loadError.message : "Unable to load loyalty details.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [clientRef, reloadKey]);

  const permissions = data?.permissions ?? [];
  const can = (action: ActionName) =>
    ACTION_PERMISSION[action].some((permission) => permissions.includes(permission));
  const isUnlinked = data?.linked === false || data?.client === null || data?.loyaltyAccount === null;

  async function submitAction(reason: string, actionValue?: string) {
    if (!pendingAction) return;
    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/loyalty/admin/clients/${encodeURIComponent(clientRef)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: pendingAction.action,
            ...(pendingAction.targetId ? { targetId: pendingAction.targetId } : {}),
            ...(pendingAction.valueLabel ? { value: Number(actionValue) } : {}),
            reason: reason.trim(),
          }),
        },
      );
      const body = (await response.json().catch(() => null)) as JsonRecord | null;
      if (!response.ok) {
        throw new Error(text(body ?? undefined, "error", "message") ?? "The loyalty action failed.");
      }
      setPendingAction(null);
      fireToast("Loyalty record updated.", "success");
      setReloadKey((current) => current + 1);
    } catch (actionError) {
      fireToast(actionError instanceof Error ? actionError.message : "The loyalty action failed.", "danger");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <PanelFrame>
        <div className="flex min-h-28 items-center justify-center gap-2 text-sm text-[var(--color-text-secondary)]" role="status">
          <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading loyalty record...
        </div>
      </PanelFrame>
    );
  }

  if (error) {
    return (
      <PanelFrame>
        <div className="flex flex-col items-start gap-3 py-4 sm:flex-row sm:items-center" role="alert">
          <AlertCircle className="h-5 w-5 shrink-0 text-[var(--color-danger)]" aria-hidden="true" />
          <div>
            <div className="text-sm font-semibold text-[var(--color-text-primary)]">Loyalty record unavailable</div>
            <div className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{error}</div>
          </div>
          <button type="button" onClick={() => setReloadKey((current) => current + 1)} className="min-h-11 rounded-control border border-[var(--color-border)] px-4 text-sm font-semibold sm:ml-auto">
            Try again
          </button>
        </div>
      </PanelFrame>
    );
  }

  if (isUnlinked) {
    return (
      <PanelFrame>
        <div className="py-5 text-center">
          <Gift className="mx-auto h-6 w-6 text-[var(--color-text-muted)]" aria-hidden="true" />
          <div className="mt-2 text-sm font-semibold">No loyalty account linked</div>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">This customer does not currently have a loyalty record.</p>
        </div>
      </PanelFrame>
    );
  }

  const summary = data?.summary ?? data?.balances ?? data ?? {};
  const eligible = count(summary, "eligibleCount", "eligibleBookings", "progress");
  const target = count(summary, "eligibleTarget", "requiredBookings", "progressTarget", "target");
  const progress = target > 0 ? Math.min(100, Math.max(0, (eligible / target) * 100)) : 0;
  const excludedBookings = data?.excludedBookings ?? [];
  const rewardBookings = data?.rewardBookings ?? [];
  const emails = data?.emailStatuses ?? data?.emails ?? [];
  const activity = data?.activity ?? data?.history ?? [];

  return (
    <PanelFrame>
      <div className="flex flex-col gap-3 border-b border-[var(--color-border)] pb-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-[17px] font-semibold text-[var(--color-text-primary)]">Loyalty administration</h2>
          <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">Rewards, eligibility, communications, and audit history</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          {can("correct_progress") && (
            <ActionButton onClick={() => setPendingAction({ action: "correct_progress", title: "Correct loyalty progress", description: "Set the customer's eligible booking count. The previous and new values will be retained in activity history.", confirmLabel: "Apply correction", valueLabel: "New eligible count", initialValue: String(eligible) })}>
              Correct progress
            </ActionButton>
          )}
          {can("issue") && (
            <ActionButton primary onClick={() => setPendingAction({ action: "issue", title: "Issue loyalty reward", description: "Confirm the number of rewards to issue to this customer.", confirmLabel: "Issue reward", valueLabel: "Rewards to issue", initialValue: "1" })}>
              Issue reward
            </ActionButton>
          )}
        </div>
      </div>

      <section className="py-4" aria-labelledby="loyalty-balance-heading">
        <h3 id="loyalty-balance-heading" className="sr-only">Loyalty balance</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Lifetime" value={count(summary, "lifetime", "lifetimeRewards")} />
          <Metric label="Available" value={count(summary, "available", "availableRewards")} />
          <Metric label="Reserved" value={count(summary, "reserved", "reservedRewards")} />
          <Metric label="Redeemed" value={count(summary, "redeemed", "redeemedRewards")} />
          <div className="rounded-control border border-[var(--color-border)] bg-[var(--color-canvas)] p-3 sm:col-span-2 lg:col-span-1">
            <div className="text-xs text-[var(--color-text-muted)]">Eligible progress</div>
            <div className="mt-1 font-display text-xl font-semibold">{eligible}{target > 0 ? ` / ${target}` : ""}</div>
            {target > 0 && <div className="mt-2 h-1.5 overflow-hidden rounded-pill bg-[var(--color-surface-muted)]" role="progressbar" aria-label="Eligible booking progress" aria-valuemin={0} aria-valuemax={target} aria-valuenow={eligible}><div className="h-full rounded-pill bg-[var(--color-kahel-500)]" style={{ width: `${progress}%` }} /></div>}
          </div>
        </div>
      </section>

      <div className="grid gap-4 border-t border-[var(--color-border)] pt-4 lg:grid-cols-2">
        <RecordSection title="Excluded bookings" empty="No excluded bookings.">
          {excludedBookings.map((booking, index) => {
            const id = identifier(booking);
            const bookingRef = text(booking, "bookingRef", "ref", "reference") ?? "Booking";
            return <RecordRow key={id ?? `${bookingRef}-${index}`} title={bookingRef} detail={[text(booking, "service", "type"), formatDate(value(booking, "date", "excludedAt"))].filter(Boolean).join(" / ")} badge="Excluded" actions={can("restore_booking") && id ? <RowButton onClick={() => setPendingAction({ action: "restore_booking", targetId: id, title: `Restore ${bookingRef}?`, description: "This booking will count toward loyalty eligibility again.", confirmLabel: "Restore booking" })}>Restore</RowButton> : undefined} />;
          })}
        </RecordSection>

        <RecordSection title="Related reward bookings" empty="No reward bookings.">
          {rewardBookings.map((booking, index) => {
            const id = identifier(booking);
            const bookingRef = text(booking, "bookingRef", "ref", "reference") ?? "Reward booking";
            const status = text(booking, "status");
            const actions = [];
            if (id && can("exclude_booking")) actions.push(<RowButton key="exclude" onClick={() => setPendingAction({ action: "exclude_booking", targetId: id, title: `Exclude ${bookingRef}?`, description: "This booking will no longer count toward loyalty progress.", confirmLabel: "Exclude booking" })}>Exclude</RowButton>);
            if (id && can("cancel_reward") && !["cancelled", "canceled", "redeemed"].includes(status?.toLowerCase() ?? "")) actions.push(<RowButton key="cancel" danger onClick={() => setPendingAction({ action: "cancel_reward", targetId: id, title: `Cancel reward for ${bookingRef}?`, description: "The reward association will be cancelled. This action is recorded in activity history.", confirmLabel: "Cancel reward" })}>Cancel</RowButton>);
            if (id && can("reinstate_reward") && ["cancelled", "canceled"].includes(status?.toLowerCase() ?? "")) actions.push(<RowButton key="reinstate" onClick={() => setPendingAction({ action: "reinstate_reward", targetId: id, title: `Reinstate reward for ${bookingRef}?`, description: "The cancelled reward will be made active again.", confirmLabel: "Reinstate reward" })}>Reinstate</RowButton>);
            if (id && can("redeem_reward") && !["redeemed", "cancelled", "canceled", "expired"].includes(status?.toLowerCase() ?? "")) actions.push(<RowButton key="redeem" onClick={() => setPendingAction({ action: "redeem_reward", targetId: id, title: `Mark reward for ${bookingRef} redeemed?`, description: "Confirm that this reward has been used. This changes the customer's available balance.", confirmLabel: "Mark redeemed" })}>Redeem</RowButton>);
            return <RecordRow key={id ?? `${bookingRef}-${index}`} title={bookingRef} detail={formatDate(value(booking, "date", "createdAt"))} badge={rewardStatus(status)} badgeClass={statusTone(status)} actions={actions.length ? actions : undefined} />;
          })}
        </RecordSection>

        <RecordSection title="Email status" empty="No loyalty emails recorded.">
          {emails.map((email, index) => {
            const id = identifier(email);
            const emailType = text(email, "type", "template", "subject") ?? "Loyalty email";
            const status = text(email, "status") ?? "unknown";
            return <RecordRow key={id ?? `${emailType}-${index}`} title={emailType} detail={`${formatDate(value(email, "sentAt", "createdAt", "updatedAt"))}${text(email, "recipient", "email") ? ` / ${text(email, "recipient", "email")}` : ""}`} badge={status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()} badgeClass={statusTone(status)} actions={can("resend") && id ? <RowButton onClick={() => setPendingAction({ action: "resend", targetId: id, title: `Resend ${emailType}?`, description: "A new copy will be sent to the recorded recipient.", confirmLabel: "Resend email" })}>Resend</RowButton> : undefined} />;
          })}
        </RecordSection>

        <section className="rounded-control border border-[var(--color-border)] p-4" aria-labelledby="loyalty-terms-heading">
          <div className="flex items-center gap-2">
            <TicketCheck className="h-4 w-4 text-[var(--color-text-muted)]" aria-hidden="true" />
            <h3 id="loyalty-terms-heading" className="text-sm font-semibold">Terms version</h3>
          </div>
          <p className="mt-3 text-sm text-[var(--color-text-secondary)]">{data?.termsVersion ?? text(data ?? undefined, "acceptedTermsVersion", "terms") ?? "Not recorded"}</p>
        </section>
      </div>

      <section className="mt-4 border-t border-[var(--color-border)] pt-4" aria-labelledby="loyalty-history-heading">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-[var(--color-text-muted)]" aria-hidden="true" />
          <h3 id="loyalty-history-heading" className="text-sm font-semibold">Activity history</h3>
        </div>
        {activity.length === 0 ? <p className="mt-3 text-sm text-[var(--color-text-muted)]">No loyalty activity recorded.</p> : <ol className="mt-3 divide-y divide-[var(--color-border)]">{activity.map((entry, index) => {
          const previous = value(entry, "previousValue", "previous");
          const next = value(entry, "newValue", "nextValue", "new");
          return <li key={identifier(entry) ?? index} className="py-3 first:pt-0 last:pb-0"><div className="flex flex-col gap-1 sm:flex-row sm:items-start"><div><div className="text-sm font-semibold">{text(entry, "label", "action", "event") ?? "Loyalty activity"}</div><div className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{text(entry, "actorName", "actor", "createdBy") ?? "System"} / {formatDate(value(entry, "createdAt", "date", "timestamp"))}</div></div>{(previous !== undefined || next !== undefined) && <div className="text-xs text-[var(--color-text-secondary)] sm:ml-auto sm:text-right"><span className="font-medium">Previous:</span> {previous === undefined ? "Not set" : String(previous)}<span className="mx-1.5">to</span><span className="font-medium">New:</span> {next === undefined ? "Not set" : String(next)}</div>}</div>{text(entry, "reason") && <p className="mt-2 text-xs leading-5 text-[var(--color-text-secondary)]"><span className="font-semibold text-[var(--color-text-primary)]">Reason:</span> {text(entry, "reason")}</p>}</li>;
        })}</ol>}
      </section>

      {pendingAction && <ActionDialog action={pendingAction} submitting={submitting} onClose={() => setPendingAction(null)} onSubmit={submitAction} />}
    </PanelFrame>
  );
}

function PanelFrame({ children }: { children: React.ReactNode }) {
  return <div className="mt-5 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-[18px]">{children}</div>;
}

function Metric({ label, value: metricValue }: { label: string; value: number }) {
  return <div className="rounded-control border border-[var(--color-border)] bg-[var(--color-canvas)] p-3"><div className="text-xs text-[var(--color-text-muted)]">{label}</div><div className="mt-1 font-display text-xl font-semibold">{metricValue}</div></div>;
}

function RecordSection({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children : children ? [children] : [];
  return <section className="overflow-hidden rounded-control border border-[var(--color-border)]"><h3 className="border-b border-[var(--color-border)] bg-[var(--color-canvas)] px-4 py-3 text-sm font-semibold">{title}</h3>{items.length ? <div className="divide-y divide-[var(--color-border)]">{children}</div> : <p className="px-4 py-5 text-sm text-[var(--color-text-muted)]">{empty}</p>}</section>;
}

function RecordRow({ title, detail, badge, badgeClass = "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]", actions }: { title: string; detail: string; badge: string; badgeClass?: string; actions?: React.ReactNode }) {
  return <div className="p-3.5"><div className="flex flex-wrap items-start gap-2"><div className="min-w-0 flex-1"><div className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</div><div className="mt-0.5 break-words text-xs text-[var(--color-text-secondary)]">{detail}</div></div><span className={`rounded-pill px-2.5 py-1 text-[11px] font-semibold ${badgeClass}`}>{badge}</span></div>{actions && <div className="mt-2 flex flex-wrap justify-end gap-2">{actions}</div>}</div>;
}

function ActionButton({ children, primary = false, onClick }: { children: React.ReactNode; primary?: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`min-h-11 rounded-control px-4 text-sm font-semibold ${primary ? "bg-[var(--color-kahel-500)] text-white hover:bg-[var(--color-kahel-600)]" : "border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-canvas)]"}`}>{children}</button>;
}

function RowButton({ children, danger = false, onClick }: { children: React.ReactNode; danger?: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`min-h-11 rounded-control border px-3 text-xs font-semibold ${danger ? "border-[var(--color-danger)] text-[var(--color-danger)]" : "border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-canvas)]"}`}>{children}</button>;
}

function ActionDialog({ action, submitting, onClose, onSubmit }: { action: PendingAction; submitting: boolean; onClose: () => void; onSubmit: (reason: string, value?: string) => Promise<void> }) {
  const [reason, setReason] = useState("");
  const [actionValue, setActionValue] = useState(action.initialValue ?? "");
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog?.open) dialog?.showModal();
    return () => dialog?.close();
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reason.trim()) return;
    void onSubmit(reason, actionValue);
  }

  return <dialog ref={dialogRef} onCancel={(event) => { event.preventDefault(); if (!submitting) onClose(); }} aria-labelledby="loyalty-action-title" aria-describedby="loyalty-action-description" className="m-auto max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-md overflow-auto rounded-card bg-transparent p-0 text-[var(--color-text-primary)] backdrop:bg-black/40"><form onSubmit={handleSubmit} className="w-full rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-dialog)]"><div className="flex items-start gap-3 border-b border-[var(--color-border)] p-5"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-kahel-100)] text-[var(--color-kahel-700)]"><Gift className="h-5 w-5" aria-hidden="true" /></div><div><h2 id="loyalty-action-title" className="font-display text-xl font-semibold">{action.title}</h2><p id="loyalty-action-description" className="mt-1 text-sm leading-5 text-[var(--color-text-secondary)]">{action.description}</p></div><button type="button" onClick={onClose} disabled={submitting} className="ml-auto flex min-h-11 min-w-11 items-center justify-center rounded-control text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]" aria-label="Close dialog"><X className="h-4 w-4" /></button></div><div className="space-y-4 p-5">{action.valueLabel && <label className="block text-sm font-semibold">{action.valueLabel}<input type="number" min="0" step="1" required value={actionValue} onChange={(event) => setActionValue(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-normal outline-none focus:border-[var(--color-kahel-500)]" /></label>}<label className="block text-sm font-semibold">Reason <span className="text-[var(--color-danger)]">*</span><textarea autoFocus required rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Enter the reason for this change" className="mt-1.5 w-full rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm font-normal outline-none focus:border-[var(--color-kahel-500)]" /></label><p className="flex gap-2 text-xs leading-5 text-[var(--color-text-secondary)]"><Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />This action and reason will be recorded in loyalty activity history.</p></div><div className="flex justify-end gap-2 border-t border-[var(--color-border)] p-4"><button type="button" onClick={onClose} disabled={submitting} className="min-h-11 rounded-control border border-[var(--color-border)] px-4 text-sm font-semibold disabled:opacity-50">Cancel</button><button type="submit" disabled={submitting || !reason.trim() || (Boolean(action.valueLabel) && actionValue === "")} className="min-h-11 rounded-control bg-[var(--color-kahel-500)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)] disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "Saving..." : action.confirmLabel}</button></div></form></dialog>;
}
