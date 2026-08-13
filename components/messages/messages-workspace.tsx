"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Mail, Search, X } from "lucide-react";
import type { MessagesResult } from "@/lib/server/messages-data";
import { MESSAGE_STATUSES, sanitizeEmailPreview, type MessageFilters, type TransactionalMessage } from "@/lib/messages";

const dateTime = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" });

export function MessagesWorkspace({ result, filters, failedView }: { result: MessagesResult; filters: MessageFilters; failedView: boolean }) {
  const [selected, setSelected] = useState<TransactionalMessage | null>(null);
  const templates = [...new Map(result.templates.map((item) => [item.key, item])).values()];
  return <main className="mx-auto w-full max-w-[1500px] p-4 pb-10 sm:p-6 lg:p-8 xl:p-10">
    <header><p className="text-xs font-semibold uppercase tracking-[.09em] text-[var(--color-kahel-700)]">Delivery ledger</p><h1 className="mt-1 font-display text-3xl font-semibold tracking-[-.025em]">{failedView ? "Failed" : "Transactional"}</h1><p className="mt-2 text-sm text-[var(--color-text-secondary)]">{failedView ? "Transactional records requiring delivery review." : "Canonical client and studio notification delivery history."} Times shown in Manila.</p></header>
    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={Mail} label="Total records" value={result.summary.total.toLocaleString()} /><Metric icon={Clock3} label="Sent today" value={result.summary.sentToday.toLocaleString()} /><Metric icon={CheckCircle2} label="Delivery rate" value={`${result.summary.deliveryRate}%`} /><Metric icon={AlertTriangle} label="Failed" value={result.summary.failed.toLocaleString()} danger={result.summary.failed > 0} /></div>
    <form method="get" className="mt-5 grid gap-3 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-3 lg:grid-cols-[minmax(220px,1fr)_180px_180px_150px_150px_auto]">
      <label className="relative"><span className="sr-only">Search messages</span><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--color-text-muted)]" /><input name="q" defaultValue={filters.query} placeholder="Recipient, subject, ID, reference" className="min-h-11 w-full rounded-control border border-[var(--color-border)] bg-[var(--color-canvas)] pl-9 pr-3 text-sm outline-none focus:border-[var(--color-kahel-500)] focus:ring-2 focus:ring-[var(--color-kahel-100)]" /></label>
      {!failedView && <label><span className="sr-only">Status</span><select name="status" defaultValue={filters.status} className="min-h-11 w-full rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"><option value="all">All statuses</option>{MESSAGE_STATUSES.filter((status) => status !== "all").map((status) => <option key={status}>{status}</option>)}</select></label>}
      <label><span className="sr-only">Template</span><select name="template" defaultValue={filters.template} className="min-h-11 w-full rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"><option value="">All templates</option>{templates.map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}</select></label>
      <label><span className="sr-only">From date</span><input type="date" name="from" defaultValue={filters.from} className="min-h-11 w-full rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm" /></label>
      <label><span className="sr-only">To date</span><input type="date" name="to" defaultValue={filters.to} className="min-h-11 w-full rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm" /></label>
      <button className="min-h-11 rounded-control bg-[var(--color-text-primary)] px-4 text-sm font-semibold text-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-kahel-300)]">Apply</button>
    </form>
    {result.reason && <div className="mt-4 rounded-control border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-4 py-3 text-sm text-[var(--color-warning-text)]">{result.reason}</div>}
    {!result.messages.length ? <Empty available={result.available} filtered={Boolean(filters.query || filters.template || filters.from || filters.to || filters.status !== "all")} failed={failedView} /> : <MessageList messages={result.messages} onSelect={setSelected} />}
    {selected && <MessageDrawer message={selected} onClose={() => setSelected(null)} />}
  </main>;
}

function Metric({ icon: Icon, label, value, danger }: { icon: typeof Mail; label: string; value: string; danger?: boolean }) {
  return <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.06em] text-[var(--color-text-muted)]"><Icon className={`h-4 w-4 ${danger ? "text-[var(--color-danger-text)]" : "text-[var(--color-kahel-600)]"}`} />{label}</div><p className="mt-3 font-display text-2xl font-semibold">{value}</p></div>;
}

function Empty({ available, filtered, failed }: { available: boolean; filtered: boolean; failed: boolean }) {
  return <section className="mt-5 grid min-h-64 place-items-center rounded-card border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-8 text-center"><div><Mail className="mx-auto h-6 w-6 text-[var(--color-text-muted)]" /><h2 className="mt-3 font-display text-lg font-semibold">{!available ? "Message source unavailable" : filtered ? "No matching messages" : failed ? "No failed deliveries" : "No transactional messages"}</h2><p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-text-secondary)]">{!available ? "Connect the canonical transactional message tables to populate this read-only ledger." : filtered ? "Change or clear the URL-backed filters to broaden the results." : "New canonical delivery records will appear here automatically."}</p></div></section>;
}

function MessageList({ messages, onSelect }: { messages: TransactionalMessage[]; onSelect: (message: TransactionalMessage) => void }) {
  return <section className="mt-5 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]"><div className="hidden grid-cols-[minmax(230px,1.2fr)_minmax(180px,1fr)_150px_150px] gap-4 border-b border-[var(--color-border)] px-4 py-3 text-xs font-semibold uppercase tracking-[.06em] text-[var(--color-text-muted)] md:grid"><span>Message</span><span>Recipient</span><span>Status</span><span>Created</span></div>{messages.map((message) => <button type="button" key={message.id} onClick={() => onSelect(message)} className="grid w-full gap-2 border-b border-[var(--color-border)] p-4 text-left last:border-0 hover:bg-[var(--color-canvas)] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-kahel-500)] md:grid-cols-[minmax(230px,1.2fr)_minmax(180px,1fr)_150px_150px] md:items-center md:gap-4"><span className="min-w-0"><span className="block truncate text-sm font-semibold">{message.subject}</span><span className="mt-1 block truncate text-xs text-[var(--color-text-muted)]">{message.templateKey} · {message.id}</span></span><span className="min-w-0 truncate text-sm text-[var(--color-text-secondary)]">{message.recipientName ? `${message.recipientName} · ` : ""}{message.recipient}</span><Status value={message.status} /><span className="text-xs text-[var(--color-text-muted)]">{dateTime.format(new Date(message.createdAt))}</span></button>)}</section>;
}

function Status({ value }: { value: string }) {
  const failed = ["failed", "bounced", "complained"].includes(value);
  const delivered = value === "delivered";
  return <span className={`w-fit rounded-pill px-2.5 py-1 text-xs font-semibold capitalize ${failed ? "bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]" : delivered ? "bg-[var(--color-success-bg)] text-[var(--color-success-text)]" : "bg-[var(--color-info-bg)] text-[var(--color-info-text)]"}`}>{value}</span>;
}

function MessageDrawer({ message, onClose }: { message: TransactionalMessage; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [preview, setPreview] = useState<"html" | "text">(message.htmlBody ? "html" : "text");
  useEffect(() => {
    returnFocus.current = document.activeElement as HTMLElement;
    const previous = document.body.style.overflow; document.body.style.overflow = "hidden"; closeRef.current?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter((item) => !item.hasAttribute("disabled"));
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", keydown); returnFocus.current?.focus(); };
  }, [onClose]);
  return <div className="fixed inset-0 z-50 flex justify-end bg-black/40" role="dialog" aria-modal="true" aria-labelledby="message-detail-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section ref={panelRef} className="h-dvh w-full overflow-y-auto bg-[var(--color-surface)] shadow-[var(--shadow-dialog)] sm:max-w-2xl"><header className="sticky top-0 z-10 flex items-start gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5"><div className="min-w-0 flex-1"><p className="text-xs text-[var(--color-text-muted)]">{message.templateKey}</p><h2 id="message-detail-title" className="mt-1 font-display text-xl font-semibold">{message.subject}</h2></div><button ref={closeRef} type="button" onClick={onClose} className="grid min-h-11 min-w-11 place-items-center rounded-control hover:bg-[var(--color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-kahel-500)]" aria-label="Close message detail"><X className="h-5 w-5" /></button></header><div className="space-y-5 p-4 sm:p-5"><dl className="grid gap-3 rounded-card bg-[var(--color-canvas)] p-4 sm:grid-cols-2"><Detail label="Recipient" value={message.recipient} /><Detail label="Status" value={message.status} /><Detail label="Message ID" value={message.id} /><Detail label="Created (Manila)" value={dateTime.format(new Date(message.createdAt))} />{message.bookingReference && <Detail label="Booking" value={message.bookingReference} />}{message.projectReference && <Detail label="Project" value={message.projectReference} />}</dl><section><div className="flex items-center justify-between gap-3"><h3 className="font-display font-semibold">Content preview</h3><div className="flex rounded-control border border-[var(--color-border)] p-0.5">{message.htmlBody && <button type="button" onClick={() => setPreview("html")} className={`min-h-9 rounded-[6px] px-3 text-xs font-semibold ${preview === "html" ? "bg-[var(--color-text-primary)] text-[var(--color-surface)]" : ""}`}>HTML</button>}<button type="button" onClick={() => setPreview("text")} className={`min-h-9 rounded-[6px] px-3 text-xs font-semibold ${preview === "text" ? "bg-[var(--color-text-primary)] text-[var(--color-surface)]" : ""}`}>Plain text</button></div></div>{preview === "html" && message.htmlBody ? <iframe title="Sanitized email preview" sandbox="" referrerPolicy="no-referrer" srcDoc={sanitizeEmailPreview(message.htmlBody)} className="mt-3 h-[28rem] w-full rounded-card border border-[var(--color-border)] bg-white" /> : <pre className="mt-3 min-h-52 whitespace-pre-wrap break-words rounded-card border border-[var(--color-border)] bg-[var(--color-canvas)] p-4 font-sans text-sm leading-6">{message.textBody || "No plaintext body was recorded."}</pre>}</section><Timeline message={message} /></div></section></div>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-semibold text-[var(--color-text-muted)]">{label}</dt><dd className="mt-1 break-all text-sm">{value}</dd></div>; }
function Timeline({ message }: { message: TransactionalMessage }) { const rows = [...message.attempts.map((item) => ({ id: `a-${item.id}`, label: `Attempt: ${item.status}`, date: item.attemptedAt, detail: item.error })), ...message.events.map((item) => ({ id: `e-${item.id}`, label: item.type, date: item.occurredAt, detail: item.detail }))].sort((a, b) => b.date.localeCompare(a.date)); return <section><h3 className="font-display font-semibold">Attempts and events</h3>{rows.length ? <ol className="mt-3 space-y-3 border-l border-[var(--color-border)] pl-4">{rows.map((row) => <li key={row.id}><p className="text-sm font-semibold capitalize">{row.label}</p><p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{dateTime.format(new Date(row.date))}</p>{row.detail && <p className="mt-1 text-xs text-[var(--color-danger-text)]">{row.detail}</p>}</li>)}</ol> : <p className="mt-2 text-sm text-[var(--color-text-secondary)]">No attempt or event records are available.</p>}</section>; }
