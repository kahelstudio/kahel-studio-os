"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Banknote, Check, Clock3, LockKeyhole, RefreshCw, X } from "lucide-react";
import { formatPeso } from "@/lib/utils";
import type { RegisterOption, RegisterSession, RegisterWorkspace as RegisterWorkspaceData } from "@/lib/server/register-data";

type Principal = { userId: string | null; email: string; role: "staff" | "admin" | "super_admin" };
type Drawer = { kind: "close"; register: RegisterOption } | { kind: "review"; register: RegisterOption } | null;

const inputClass = "mt-1.5 min-h-11 w-full rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm outline-none focus:border-[var(--color-kahel-500)] focus:ring-2 focus:ring-[var(--color-kahel-100)]";
const primaryClass = "min-h-11 rounded-control bg-[var(--color-kahel-500)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-kahel-500)] focus-visible:ring-offset-2 disabled:opacity-50";
const secondaryClass = "min-h-11 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-semibold hover:bg-[var(--color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-kahel-500)] disabled:opacity-50";

function pesoInput(value: string) {
  if (!/^\d+(?:\.\d{0,2})?$/.test(value.trim())) return null;
  const centavos = Math.round(Number(value) * 100);
  return Number.isSafeInteger(centavos) && centavos >= 0 ? centavos : null;
}

function dateTime(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not recorded";
}

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function RegisterWorkspace({ initialWorkspace, principal }: { initialWorkspace: RegisterWorkspaceData; principal: Principal }) {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [selectedId, setSelectedId] = useState(initialWorkspace.registers[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [drawer, setDrawer] = useState<Drawer>(null);
  const selected = workspace.registers.find((register) => register.id === selectedId) ?? workspace.registers[0];

  async function refresh() {
    const response = await fetch("/api/pos/register", { cache: "no-store" });
    const payload = await response.json() as { workspace?: RegisterWorkspaceData; error?: string };
    if (!response.ok || !payload.workspace) throw new Error(payload.error ?? "Unable to refresh register data.");
    setWorkspace(payload.workspace);
  }

  async function mutate(body: Record<string, unknown>, success: string) {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/pos/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "The register operation failed.");
      await refresh();
      setMessage(success);
      setDrawer(null);
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The register operation failed.");
      return false;
    } finally { setBusy(false); }
  }

  return (
    <main className="min-h-full bg-[var(--color-surface-muted)] p-4 text-[var(--color-text-primary)] sm:p-6 lg:p-8">
      <header className="mx-auto flex max-w-[1400px] flex-wrap items-end justify-between gap-4 border-b border-[var(--color-border)] pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-kahel-600)]">Point of sale</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Register</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Open, count, and independently review physical cash.</p>
        </div>
        {workspace.registers.length > 1 ? <label className="text-sm font-semibold">Register
          <select className={`${inputClass} min-w-64`} value={selected?.id ?? ""} onChange={(event) => setSelectedId(event.target.value)}>
            {workspace.registers.map((register) => <option key={register.id} value={register.id}>{register.locationName} / {register.name}</option>)}
          </select>
        </label> : selected ? <div className="rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-right">
          <div className="text-sm font-semibold">{selected.name}</div><div className="text-xs text-[var(--color-text-secondary)]">{selected.locationName}</div>
        </div> : null}
      </header>

      <div className="sr-only" role="status" aria-live="polite">{message}</div>
      <div className="mx-auto mt-4 max-w-[1400px]" aria-live="assertive">{error ? <p className="rounded-control bg-[var(--color-danger-bg)] p-3 text-sm text-[var(--color-danger-text)]" role="alert">{error}</p> : null}{message ? <p className="rounded-control bg-[var(--color-success-bg)] p-3 text-sm text-[var(--color-success-text)]">{message}</p> : null}</div>

      {!selected ? <Empty title="No active registers" detail="Configure an active location and cash register before using this workspace." /> : !selected.activeSession ? (
        <div className="mx-auto mt-5 max-w-2xl"><OpenRegister register={selected} busy={busy} submit={mutate} /></div>
      ) : (
        <div className="mx-auto mt-5 grid max-w-[1400px] gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0 space-y-5">
            <SessionSummary register={selected} />
            <MovementList session={selected.activeSession} />
          </section>
          <aside className="space-y-5">
            {selected.activeSession.status === "open" ? <OpenActions register={selected} principal={principal} busy={busy} mutate={mutate} openClose={() => setDrawer({ kind: "close", register: selected })} /> : <ReviewPanel register={selected} principal={principal} openReview={() => setDrawer({ kind: "review", register: selected })} />}
            <SessionDetails session={selected.activeSession} />
          </aside>
        </div>
      )}
      <ClosedHistory sessions={workspace.recentClosed} />
      {drawer?.kind === "close" ? <CloseDrawer register={drawer.register} busy={busy} close={() => setDrawer(null)} submit={mutate} /> : null}
      {drawer?.kind === "review" ? <ReviewDrawer register={drawer.register} busy={busy} close={() => setDrawer(null)} submit={mutate} /> : null}
    </main>
  );
}

function OpenRegister({ register, busy, submit }: { register: RegisterOption; busy: boolean; submit: (body: Record<string, unknown>, message: string) => Promise<boolean> }) {
  const [opening, setOpening] = useState(register.minimumCashCentavos ? (register.minimumCashCentavos / 100).toFixed(2) : "");
  const [note, setNote] = useState("");
  async function onSubmit(event: FormEvent) {
    event.preventDefault(); const amount = pesoInput(opening); if (amount === null) return;
    await submit({ action: "open", registerId: register.id, openingAmountCentavos: amount, note }, "Register opened.");
  }
  return <form onSubmit={onSubmit} className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm sm:p-6">
    <div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-control bg-[var(--color-kahel-100)] text-[var(--color-kahel-700)]"><LockKeyhole className="h-5 w-5" /></div><div><h2 className="font-display text-xl font-semibold">Open register</h2><p className="mt-1 text-sm text-[var(--color-text-secondary)]">{register.locationName} / {register.name}</p></div></div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Opening cash (PHP)<input autoFocus inputMode="decimal" required placeholder="0.00" value={opening} onChange={(event) => setOpening(event.target.value)} className={inputClass} /></label><div className="rounded-control bg-[var(--color-surface-muted)] p-3 text-sm"><div className="text-[var(--color-text-secondary)]">Location minimum</div><div className="mt-1 font-display text-lg font-semibold">{formatPeso(register.minimumCashCentavos, { decimals: true })}</div></div></div>
    <label className="mt-4 block text-sm font-semibold">Opening note <span className="font-normal text-[var(--color-text-muted)]">Optional</span><textarea maxLength={2000} rows={3} value={note} onChange={(event) => setNote(event.target.value)} className={`${inputClass} py-3`} /></label>
    <button disabled={busy || pesoInput(opening) === null} className={`mt-5 w-full ${primaryClass}`}>{busy ? "Opening..." : "Open register"}</button>
  </form>;
}

function SessionSummary({ register }: { register: RegisterOption }) {
  const session = register.activeSession!;
  return <section className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h2 className="font-display text-xl font-semibold">{register.name}</h2><Status status={session.status} /></div><p className="mt-1 text-sm text-[var(--color-text-secondary)]">{register.locationName} · Opened by {session.openerName} {dateTime(session.openedAt)}</p></div><div className="text-right"><div className="text-xs text-[var(--color-text-secondary)]">Expected cash</div><div className="font-display text-2xl font-bold tabular-nums">{formatPeso(session.expectedAmountCentavos, { decimals: true })}</div></div></div>
    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4"><Metric label="Opening" value={session.openingAmountCentavos} /><Metric label="Cash in" value={session.cashInCentavos} tone="in" /><Metric label="Cash out" value={session.cashOutCentavos} tone="out" /><Metric label="Movements" text={String(session.movements.filter((item) => item.kind === "cash").length)} /></div>
  </section>;
}

function Metric({ label: metricLabel, value, text, tone }: { label: string; value?: number; text?: string; tone?: "in" | "out" }) {
  return <div className="rounded-control bg-[var(--color-surface-muted)] p-3"><div className="text-xs text-[var(--color-text-secondary)]">{metricLabel}</div><div className={`mt-1 font-display text-base font-semibold tabular-nums ${tone === "in" ? "text-[var(--color-success-text)]" : tone === "out" ? "text-[var(--color-danger-text)]" : ""}`}>{text ?? formatPeso(value ?? 0, { decimals: true })}</div></div>;
}

function MovementList({ session }: { session: RegisterSession }) {
  return <section className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm"><header className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4"><div><h2 className="font-display text-lg font-semibold">Movement timeline</h2><p className="text-xs text-[var(--color-text-secondary)]">Cash and lifecycle entries are immutable.</p></div><Clock3 className="h-5 w-5 text-[var(--color-text-muted)]" /></header>
    {session.movements.length === 0 ? <Empty title="No movements yet" detail="Payments and cash adjustments will appear here." compact /> : <>
      <div className="divide-y divide-[var(--color-border)] md:hidden">{session.movements.map((movement) => <div key={`${movement.kind}-${movement.id}`} className="p-4"><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-semibold">{label(movement.eventType)}</div><div className="mt-1 text-xs text-[var(--color-text-secondary)]">{movement.actorName} · {dateTime(movement.occurredAt)}</div></div>{movement.amountCentavos !== null ? <Amount direction={movement.direction} amount={movement.amountCentavos} /> : null}</div>{movement.reason ? <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{movement.reason}</p> : null}</div>)}</div>
      <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead className="bg-[var(--color-surface-muted)] text-xs text-[var(--color-text-secondary)]"><tr><th className="px-5 py-3 font-semibold">Movement</th><th className="px-5 py-3 font-semibold">Staff</th><th className="px-5 py-3 font-semibold">Time</th><th className="px-5 py-3 text-right font-semibold">Amount</th></tr></thead><tbody className="divide-y divide-[var(--color-border)]">{session.movements.map((movement) => <tr key={`${movement.kind}-${movement.id}`}><td className="px-5 py-3"><div className="font-semibold">{label(movement.eventType)}</div>{movement.reason ? <div className="mt-0.5 max-w-md truncate text-xs text-[var(--color-text-secondary)]">{movement.reason}</div> : null}</td><td className="px-5 py-3">{movement.actorName}</td><td className="whitespace-nowrap px-5 py-3 text-[var(--color-text-secondary)]">{dateTime(movement.occurredAt)}</td><td className="px-5 py-3 text-right">{movement.amountCentavos !== null ? <Amount direction={movement.direction} amount={movement.amountCentavos} /> : "-"}</td></tr>)}</tbody></table></div>
    </>}
  </section>;
}

function Amount({ direction, amount }: { direction: "in" | "out" | null; amount: number }) { return <span className={`font-semibold tabular-nums ${direction === "in" ? "text-[var(--color-success-text)]" : "text-[var(--color-danger-text)]"}`}>{direction === "in" ? "+" : "-"}{formatPeso(amount, { decimals: true })}</span>; }

function OpenActions({ register, principal, busy, mutate, openClose }: { register: RegisterOption; principal: Principal; busy: boolean; mutate: (body: Record<string, unknown>, message: string) => Promise<boolean>; openClose: () => void }) {
  return <section className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm"><h2 className="font-display text-lg font-semibold">Register controls</h2>{principal.role === "super_admin" ? <ManualCash sessionId={register.activeSession!.id} busy={busy} mutate={mutate} /> : <p className="mt-3 rounded-control bg-[var(--color-surface-muted)] p-3 text-sm text-[var(--color-text-secondary)]">Manual cash movements require Super Admin access.</p>}<button type="button" disabled={busy || principal.userId !== register.activeSession!.openedBy} onClick={openClose} className={`mt-4 w-full ${primaryClass}`}>Count and submit close</button>{principal.userId !== register.activeSession!.openedBy ? <p className="mt-2 text-xs text-[var(--color-text-muted)]">Only {register.activeSession!.openerName}, the opener, can submit this close.</p> : null}</section>;
}

function ManualCash({ sessionId, busy, mutate }: { sessionId: string; busy: boolean; mutate: (body: Record<string, unknown>, message: string) => Promise<boolean> }) {
  const [direction, setDirection] = useState<"manual_cash_in" | "manual_cash_out">("manual_cash_in"); const [amount, setAmount] = useState(""); const [reason, setReason] = useState("");
  async function submit(event: FormEvent) { event.preventDefault(); const centavos = pesoInput(amount); if (centavos === null || centavos <= 0) return; const ok = await mutate({ action: direction, sessionId, amountCentavos: centavos, reason, idempotencyKey: crypto.randomUUID() }, direction === "manual_cash_in" ? "Cash in recorded." : "Cash out recorded."); if (ok) { setAmount(""); setReason(""); } }
  return <form onSubmit={submit} className="mt-4 border-t border-[var(--color-border)] pt-4"><div className="grid grid-cols-2 gap-2"><button type="button" aria-pressed={direction === "manual_cash_in"} onClick={() => setDirection("manual_cash_in")} className={`${secondaryClass} flex items-center justify-center gap-2 ${direction === "manual_cash_in" ? "border-[var(--color-success-text)] text-[var(--color-success-text)]" : ""}`}><ArrowDownToLine className="h-4 w-4" />Cash in</button><button type="button" aria-pressed={direction === "manual_cash_out"} onClick={() => setDirection("manual_cash_out")} className={`${secondaryClass} flex items-center justify-center gap-2 ${direction === "manual_cash_out" ? "border-[var(--color-danger-text)] text-[var(--color-danger-text)]" : ""}`}><ArrowUpFromLine className="h-4 w-4" />Cash out</button></div><label className="mt-3 block text-sm font-semibold">Amount (PHP)<input inputMode="decimal" required value={amount} onChange={(event) => setAmount(event.target.value)} className={inputClass} /></label><label className="mt-3 block text-sm font-semibold">Reason<input required minLength={3} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} className={inputClass} /></label><button disabled={busy || !pesoInput(amount) || reason.trim().length < 3} className={`mt-3 w-full ${secondaryClass}`}>{busy ? "Recording..." : `Record ${direction === "manual_cash_in" ? "cash in" : "cash out"}`}</button></form>;
}

function ReviewPanel({ register, principal, openReview }: { register: RegisterOption; principal: Principal; openReview: () => void }) {
  const session = register.activeSession!; const canReview = (principal.role === "admin" || principal.role === "super_admin") && principal.userId !== session.openedBy;
  return <section className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm"><h2 className="font-display text-lg font-semibold">Pending review</h2><div className="mt-4 grid grid-cols-2 gap-2"><Metric label="Expected" value={session.expectedAmountCentavos} /><Metric label="Counted" value={session.countedAmountCentavos ?? 0} /></div><div className="mt-3 flex items-center justify-between rounded-control bg-[var(--color-surface-muted)] p-3 text-sm"><span>Variance</span><strong className={session.varianceCentavos === 0 ? "text-[var(--color-success-text)]" : "text-[var(--color-danger-text)]"}>{formatPeso(session.varianceCentavos ?? 0, { decimals: true })}</strong></div><button disabled={!canReview} onClick={openReview} className={`mt-4 w-full ${primaryClass}`}>Review close</button>{!canReview ? <p className="mt-2 text-xs text-[var(--color-text-muted)]">An Admin or Super Admin other than the opener must review this close.</p> : null}</section>;
}

function SessionDetails({ session }: { session: RegisterSession }) { return <section className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-sm shadow-sm"><h2 className="font-display text-lg font-semibold">Session details</h2><dl className="mt-4 space-y-3"><Detail term="Session ID" value={session.id} mono /><Detail term="Opened" value={dateTime(session.openedAt)} /><Detail term="Opened by" value={session.openerName} />{session.openingNote ? <Detail term="Opening note" value={session.openingNote} /> : null}{session.closeNote ? <Detail term="Close note" value={session.closeNote} /> : null}</dl></section>; }
function Detail({ term, value, mono = false }: { term: string; value: string; mono?: boolean }) { return <div><dt className="text-xs text-[var(--color-text-secondary)]">{term}</dt><dd className={`mt-0.5 break-words font-medium ${mono ? "font-mono text-xs" : ""}`}>{value}</dd></div>; }

function ClosedHistory({ sessions }: { sessions: RegisterWorkspaceData["recentClosed"] }) { return <section className="mx-auto mt-6 max-w-[1400px] overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm"><header className="border-b border-[var(--color-border)] px-5 py-4"><h2 className="font-display text-lg font-semibold">Closed history</h2><p className="text-xs text-[var(--color-text-secondary)]">Most recent independently approved sessions.</p></header>{sessions.length ? <div className="divide-y divide-[var(--color-border)]">{sessions.map((session) => <details key={session.id} className="group"><summary className="flex min-h-14 cursor-pointer list-none flex-wrap items-center gap-x-5 gap-y-1 px-5 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-kahel-500)]"><div className="min-w-44 flex-1"><div className="text-sm font-semibold">{session.locationName} / {session.registerName}</div><div className="text-xs text-[var(--color-text-secondary)]">Closed {dateTime(session.closedAt)}</div></div><div className="text-xs text-[var(--color-text-secondary)]">Counted <strong className="ml-1 text-[var(--color-text-primary)]">{formatPeso(session.countedAmountCentavos ?? 0, { decimals: true })}</strong></div><div className="text-xs text-[var(--color-text-secondary)]">Variance <strong className={`ml-1 ${session.varianceCentavos === 0 ? "text-[var(--color-success-text)]" : "text-[var(--color-danger-text)]"}`}>{formatPeso(session.varianceCentavos ?? 0, { decimals: true })}</strong></div></summary><div className="grid gap-3 bg-[var(--color-surface-muted)] px-5 py-4 text-sm sm:grid-cols-3"><Detail term="Opened by" value={session.openerName} /><Detail term="Reviewed by" value={session.reviewerName ?? "Unknown"} /><Detail term="Expected" value={formatPeso(session.expectedAmountCentavos, { decimals: true })} />{session.reviewNote ? <Detail term="Review note" value={session.reviewNote} /> : null}</div></details>)}</div> : <Empty title="No closed sessions" detail="Approved register closes will appear here." compact />}</section>; }

function CloseDrawer({ register, busy, close, submit }: { register: RegisterOption; busy: boolean; close: () => void; submit: (body: Record<string, unknown>, message: string) => Promise<boolean> }) {
  const [counted, setCounted] = useState(""); const [note, setNote] = useState(""); const amount = pesoInput(counted); const variance = amount === null ? null : amount - register.activeSession!.expectedAmountCentavos;
  return <DrawerFrame title="Count and submit close" subtitle={`${register.locationName} / ${register.name}`} close={close} busy={busy}><form onSubmit={async (event) => { event.preventDefault(); if (amount === null) return; await submit({ action: "submit_close", sessionId: register.activeSession!.id, countedAmountCentavos: amount, note }, "Close submitted for independent review."); }} className="p-5"><div className="rounded-control bg-[var(--color-surface-muted)] p-4"><div className="text-xs text-[var(--color-text-secondary)]">Expected cash</div><div className="mt-1 font-display text-2xl font-bold">{formatPeso(register.activeSession!.expectedAmountCentavos, { decimals: true })}</div></div><label className="mt-5 block text-sm font-semibold">Counted cash (PHP)<input autoFocus required inputMode="decimal" value={counted} onChange={(event) => setCounted(event.target.value)} className={inputClass} /></label>{variance !== null ? <div className="mt-3 flex justify-between rounded-control border border-[var(--color-border)] p-3 text-sm"><span>Variance</span><strong className={variance === 0 ? "text-[var(--color-success-text)]" : "text-[var(--color-danger-text)]"}>{formatPeso(variance, { decimals: true })}</strong></div> : null}<label className="mt-4 block text-sm font-semibold">Close note <span className="font-normal text-[var(--color-text-muted)]">Optional</span><textarea maxLength={2000} rows={4} value={note} onChange={(event) => setNote(event.target.value)} className={`${inputClass} py-3`} /></label><p className="mt-4 text-xs leading-5 text-[var(--color-text-secondary)]">Submitting locks cash movement and requires a different Admin or Super Admin to approve or reopen the session.</p><button disabled={busy || amount === null} className={`mt-5 w-full ${primaryClass}`}>{busy ? "Submitting..." : "Submit close for review"}</button></form></DrawerFrame>;
}

function ReviewDrawer({ register, busy, close, submit }: { register: RegisterOption; busy: boolean; close: () => void; submit: (body: Record<string, unknown>, message: string) => Promise<boolean> }) {
  const [note, setNote] = useState(""); const session = register.activeSession!;
  async function decision(approve: boolean) { await submit({ action: "review", sessionId: session.id, approve, note }, approve ? "Register close approved." : "Register reopened for correction."); }
  return <DrawerFrame title="Review register close" subtitle={`Submitted by ${session.openerName}`} close={close} busy={busy}><div className="p-5"><div className="grid grid-cols-3 gap-2"><Metric label="Expected" value={session.expectedAmountCentavos} /><Metric label="Counted" value={session.countedAmountCentavos ?? 0} /><Metric label="Variance" value={session.varianceCentavos ?? 0} /></div>{session.closeNote ? <div className="mt-4 rounded-control bg-[var(--color-surface-muted)] p-3 text-sm"><div className="text-xs text-[var(--color-text-secondary)]">Opener note</div><p className="mt-1">{session.closeNote}</p></div> : null}<label className="mt-5 block text-sm font-semibold">Review note <span className="font-normal text-[var(--color-text-muted)]">Optional</span><textarea autoFocus maxLength={2000} rows={4} value={note} onChange={(event) => setNote(event.target.value)} className={`${inputClass} py-3`} /></label><div className="mt-5 grid gap-2 sm:grid-cols-2"><button type="button" disabled={busy} onClick={() => decision(false)} className={`${secondaryClass} flex items-center justify-center gap-2`}><RefreshCw className="h-4 w-4" />Reopen register</button><button type="button" disabled={busy} onClick={() => decision(true)} className={`${primaryClass} flex items-center justify-center gap-2`}><Check className="h-4 w-4" />Approve close</button></div></div></DrawerFrame>;
}

function DrawerFrame({ title, subtitle, close, busy, children }: { title: string; subtitle: string; close: () => void; busy: boolean; children: ReactNode }) {
  const titleId = useId(); const panel = useRef<HTMLElement>(null); const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { closeButton.current?.focus(); const key = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy) close(); if (event.key !== "Tab" || !panel.current) return; const items = [...panel.current.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])')]; if (!items.length) return; if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1)?.focus(); } else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); } }; document.addEventListener("keydown", key); return () => document.removeEventListener("keydown", key); }, [busy, close]);
  return <div className="fixed inset-0 z-50 bg-black/45" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) close(); }}><aside ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} className="absolute inset-y-0 right-0 w-full max-w-lg overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-dialog)]"><header className="sticky top-0 z-10 flex items-start gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] p-5"><div><h2 id={titleId} className="font-display text-xl font-semibold">{title}</h2><p className="mt-1 text-sm text-[var(--color-text-secondary)]">{subtitle}</p></div><button ref={closeButton} type="button" disabled={busy} onClick={close} className="ml-auto grid min-h-11 min-w-11 place-items-center rounded-control hover:bg-[var(--color-surface-muted)]" aria-label={`Close ${title}`}><X className="h-5 w-5" /></button></header>{children}</aside></div>;
}

function Status({ status }: { status: RegisterSession["status"] }) { return <span className={`rounded-pill px-2.5 py-1 text-[11px] font-semibold ${status === "open" ? "bg-[var(--color-success-bg)] text-[var(--color-success-text)]" : "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]"}`}>{label(status)}</span>; }
function Empty({ title, detail, compact = false }: { title: string; detail: string; compact?: boolean }) { return <div className={`${compact ? "p-8" : "mx-auto mt-8 max-w-2xl rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-12"} text-center`}><Banknote className="mx-auto h-7 w-7 text-[var(--color-text-muted)]" /><h2 className="mt-3 font-display text-lg font-semibold">{title}</h2><p className="mt-1 text-sm text-[var(--color-text-secondary)]">{detail}</p></div>; }
