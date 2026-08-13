import Link from "next/link";
import { Mail, MoveUpRight } from "lucide-react";
import { getCurrentStaffPrincipal } from "@/lib/server/current-staff";
import { getEmailHistory } from "@/lib/server/messages-data";
import { canAccessMessages } from "@/lib/messages";

type Context = { clientId?: string; bookingId?: string; bookingReference?: string; projectId?: string; projectReference?: string; paymentId?: string; galleryId?: string };
const date = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" });

export async function EmailHistory({ context, title = "Email history" }: { context: Context; title?: string }) {
  const principal = await getCurrentStaffPrincipal();
  if (!principal || !canAccessMessages(principal)) return null;
  const result = await getEmailHistory(principal, context);
  const query = Object.values(context).find(Boolean) ?? "";
  return <section className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Mail className="h-4 w-4 text-[var(--color-kahel-600)]" /><h2 className="font-display text-[15px] font-semibold">{title}</h2></div><Link href={`/messages/transactional?q=${encodeURIComponent(query)}`} className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-[var(--color-kahel-700)] hover:underline">All messages <MoveUpRight className="h-3.5 w-3.5" /></Link></div>{!result.available ? <p className="mt-3 text-sm text-[var(--color-text-secondary)]">Canonical message history is not available.</p> : !result.messages.length ? <p className="mt-3 text-sm text-[var(--color-text-muted)]">No transactional emails are linked to this record.</p> : <ol className="mt-3 divide-y divide-[var(--color-border)]">{result.messages.map((message) => <li key={message.id} className="py-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{message.subject}</p><p className="mt-1 truncate text-xs text-[var(--color-text-secondary)]">{message.recipient}</p></div><span className="rounded-pill bg-[var(--color-surface-muted)] px-2 py-1 text-[11px] font-semibold capitalize">{message.status}</span></div><p className="mt-1 text-xs text-[var(--color-text-muted)]">{date.format(new Date(message.createdAt))}</p></li>)}</ol>}</section>;
}
