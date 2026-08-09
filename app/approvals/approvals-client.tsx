"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Clock3, ExternalLink, FileImage, X } from "lucide-react";
import { useToast } from "@/components/toast/toast-provider";
import type { ApprovalItem } from "@/lib/server/approvals-data";

export function ApprovalsClient({ initialItems }: { initialItems: ApprovalItem[] }) {
  const { fireToast } = useToast();
  const [items, setItems] = useState(initialItems);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function decide(item: ApprovalItem, approvalStatus: "approved" | "rejected") {
    setPendingId(item.id);
    try {
      const response = await fetch(`/api/media/admin/galleries/${item.galleryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetUpdates: [{ id: item.id, approvalStatus }] }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to update this approval.");
      setItems((current) => current.filter((candidate) => candidate.id !== item.id));
      fireToast(approvalStatus === "approved" ? "Asset approved." : "Asset rejected.", "success");
    } catch (error) {
      fireToast(error instanceof Error ? error.message : "Unable to update this approval.", "danger");
    } finally {
      setPendingId(null);
    }
  }

  return <div className="min-w-0 p-5 pb-14 sm:p-8 lg:p-10">
    <header className="flex flex-col gap-4 border-b border-[var(--color-border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div><div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Projects / Review</div><h1 className="mt-2 font-display text-[32px] font-semibold tracking-[-0.025em] sm:text-[36px]">Approvals</h1><p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">Review project media before it reaches a client gallery.</p></div>
      <div className="flex min-h-11 items-center gap-2 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-semibold"><Clock3 className="h-4 w-4 text-[var(--color-kahel-500)]" />{items.length} pending</div>
    </header>
    {items.length ? <div className="mt-6 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
      {items.map((item) => <article key={item.id} className="grid gap-4 border-b border-[var(--color-border)] p-4 last:border-b-0 sm:grid-cols-[48px_minmax(0,1fr)_auto] sm:items-center sm:p-5">
        <div className="grid h-12 w-12 place-items-center rounded-control bg-[var(--color-indigo-100)] text-[var(--color-indigo-800)]"><FileImage className="h-5 w-5" /></div>
        <div className="min-w-0"><div className="truncate text-sm font-semibold">{item.filename}</div><div className="mt-1 truncate text-xs text-[var(--color-text-secondary)]">{item.client} · {item.project}</div><div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[var(--color-text-muted)]"><span>{item.gallery}</span><span aria-hidden>·</span><span className="capitalize">{item.mediaStatus}</span><span aria-hidden>·</span><span>{formatDate(item.submittedAt)}</span></div>{item.caption ? <p className="mt-2 line-clamp-2 text-xs text-[var(--color-text-secondary)]">{item.caption}</p> : null}</div>
        <div className="flex flex-wrap gap-2 sm:justify-end"><Link href="/projects/deliveries" className="grid min-h-11 min-w-11 place-items-center rounded-control border border-[var(--color-border)]" aria-label="Open gallery"><ExternalLink className="h-4 w-4" /></Link><button type="button" disabled={pendingId === item.id} onClick={() => void decide(item, "rejected")} className="inline-flex min-h-11 items-center gap-1.5 rounded-control border border-[var(--color-border)] px-3 text-sm font-semibold text-[var(--color-danger-text)] disabled:opacity-50"><X className="h-4 w-4" /> Reject</button><button type="button" disabled={pendingId === item.id || item.mediaStatus !== "ready"} onClick={() => void decide(item, "approved")} className="inline-flex min-h-11 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-3 text-sm font-semibold text-white disabled:opacity-50"><Check className="h-4 w-4" /> Approve</button></div>
      </article>)}
    </div> : <div className="mt-6 grid min-h-72 place-items-center rounded-card border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-8 text-center"><div><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--color-success-bg)] text-[var(--color-success-text)]"><Check className="h-5 w-5" /></div><h2 className="mt-4 font-display text-xl font-semibold">All caught up</h2><p className="mt-1 text-sm text-[var(--color-text-secondary)]">There are no project assets waiting for approval.</p></div></div>}
  </div>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(value));
}
