"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import type { TransactionalMessage } from "@/lib/messages";

type Context = { clientId?: string; bookingId?: string; bookingReference?: string; projectId?: string; projectReference?: string; paymentId?: string; galleryId?: string };

export function ClientEmailHistory({ context, title = "Email history" }: { context: Context; title?: string }) {
  const [state, setState] = useState<{ loading: boolean; available: boolean; messages: TransactionalMessage[]; error: boolean }>({ loading: true, available: true, messages: [], error: false });
  const clientId = context.clientId, bookingId = context.bookingId, bookingReference = context.bookingReference, projectId = context.projectId, projectReference = context.projectReference, paymentId = context.paymentId, galleryId = context.galleryId;
  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams(Object.entries({ clientId, bookingId, bookingReference, projectId, projectReference, paymentId, galleryId }).filter((entry): entry is [string, string] => Boolean(entry[1])));
    fetch(`/api/messages/history?${query}`, { signal: controller.signal }).then(async (response) => { if (!response.ok) throw new Error(); return response.json() as Promise<{ available: boolean; messages: TransactionalMessage[] }>; }).then((result) => setState({ loading: false, available: result.available, messages: result.messages, error: false })).catch((error) => { if (error instanceof DOMException && error.name === "AbortError") return; setState({ loading: false, available: false, messages: [], error: true }); });
    return () => controller.abort();
  }, [bookingId, bookingReference, clientId, galleryId, paymentId, projectId, projectReference]);
  const search = Object.values(context).find(Boolean) ?? "";
  return <section className="rounded-card border border-[var(--color-border)] p-4"><div className="flex items-center justify-between gap-2"><h3 className="inline-flex items-center gap-2 font-semibold"><Mail className="h-4 w-4 text-[var(--color-kahel-600)]" />{title}</h3><Link href={`/messages/transactional?q=${encodeURIComponent(search)}`} className="text-xs font-semibold text-[var(--color-kahel-700)]">Open ledger</Link></div>{state.loading ? <div className="mt-3 h-14 animate-pulse rounded-control bg-[var(--color-surface-muted)]" aria-label="Loading email history" /> : state.error || !state.available ? <p className="mt-3 text-sm text-[var(--color-text-secondary)]">Canonical message history is unavailable.</p> : !state.messages.length ? <p className="mt-3 text-sm text-[var(--color-text-muted)]">No linked transactional emails.</p> : <ol className="mt-2 divide-y divide-[var(--color-border)]">{state.messages.slice(0, 5).map((message) => <li key={message.id} className="py-2"><div className="flex justify-between gap-3"><span className="truncate text-sm font-semibold">{message.subject}</span><span className="text-xs capitalize text-[var(--color-text-muted)]">{message.status}</span></div><p className="mt-0.5 truncate text-xs text-[var(--color-text-secondary)]">{message.recipient}</p></li>)}</ol>}</section>;
}
