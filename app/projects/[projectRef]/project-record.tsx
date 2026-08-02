"use client";

import Link from "next/link";
import { ExternalLink, Heart, MessageSquareText, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { CLIENT_PORTAL } from "@/lib/client-portal-data";

type PortalSummary = {
  config: { published: boolean };
  status: { published: boolean; linkExpiresAt: string | null; linkActive: boolean };
  activity: {
    favorites: Record<string, true>;
    rating: number;
    tags: Record<string, true>;
    feedbackSent: boolean;
    selectsSubmitted: boolean;
    selectsSubmittedAt: string | null;
    feedbackSubmittedAt: string | null;
    lastAccessedAt: string | null;
    downloadCount: number;
    lastDownloadedAt: string | null;
  };
};

function dateTime(value: string | null) {
  return value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Not yet";
}

export default function ProjectRecord({ projectRef }: { projectRef: string }) {
  const [portal, setPortal] = useState<PortalSummary | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/client-portals/${encodeURIComponent(projectRef)}`)
      .then((response) => response.ok ? response.json() as Promise<PortalSummary> : Promise.reject())
      .then((data) => { if (active) setPortal(data); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [projectRef]);

  if (error) return <div className="p-5 sm:p-10"><h1 className="font-display text-2xl font-semibold">Project not found</h1></div>;
  if (!portal) return <div className="p-5 text-sm text-[var(--color-text-secondary)] sm:p-10">Loading project record...</div>;

  const activity = portal.activity;
  const portalStatus = !portal.status.published ? "Draft" : portal.status.linkActive ? "Shared link active" : "No active link";
  const portalStatusStyle = !portal.status.published ? "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]" : portal.status.linkActive ? "bg-[var(--color-success-bg)] text-[var(--color-success-text)]" : "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]";

  return (
    <div className="mx-auto max-w-5xl p-5 pb-14 sm:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-[var(--color-text-muted)]">{projectRef}</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-.025em]">{CLIENT_PORTAL.clientName}</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{CLIENT_PORTAL.booking.type} · {CLIENT_PORTAL.booking.date}</p>
        </div>
        <Link href="/projects/deliveries" className="inline-flex h-10 items-center gap-2 rounded-control border border-[var(--color-border-strong)] px-3.5 text-sm font-semibold text-[var(--color-kahel-700)] hover:border-[var(--color-kahel-500)]"><ExternalLink className="h-4 w-4" /> Manage portal</Link>
      </div>

      <section className="mt-8 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="font-display text-xl font-semibold">Client portal</h2><p className="mt-1 text-sm text-[var(--color-text-secondary)]">Live delivery and client engagement for this project.</p></div>
          <span className={`rounded-pill px-3 py-1.5 text-sm font-semibold ${portalStatusStyle}`}>{portalStatus}</span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Metric label="Portal last opened" value={dateTime(activity.lastAccessedAt)} />
          <Metric label="Link expires" value={dateTime(portal.status.linkExpiresAt)} />
          <Metric label="Gallery downloads" value={`${activity.downloadCount} ${activity.downloadCount === 1 ? "download" : "downloads"}`} detail={activity.lastDownloadedAt ? `Last: ${dateTime(activity.lastDownloadedAt)}` : undefined} />
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="flex items-center gap-2"><Heart className="h-4 w-4 text-[var(--color-kahel-600)]" /><h2 className="font-display text-lg font-semibold">Album selects</h2></div>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{Object.keys(activity.favorites).length} photos currently selected.</p>
          <div className="mt-4 rounded-control bg-[var(--color-canvas)] p-3 text-sm"><span className="font-semibold">{activity.selectsSubmitted ? "Submitted to studio" : "Not submitted"}</span><span className="mt-0.5 block text-[var(--color-text-secondary)]">{activity.selectsSubmitted ? dateTime(activity.selectsSubmittedAt) : "The client can continue updating their picks."}</span></div>
        </section>
        <section className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="flex items-center gap-2"><MessageSquareText className="h-4 w-4 text-[var(--color-kahel-600)]" /><h2 className="font-display text-lg font-semibold">Client feedback</h2></div>
          {activity.feedbackSent ? <><div className="mt-3 flex gap-1 text-[var(--color-kahel-500)]">{[1, 2, 3, 4, 5].map((star) => <Star key={star} className="h-5 w-5" fill={star <= activity.rating ? "currentColor" : "none"} />)}</div><p className="mt-3 text-sm text-[var(--color-text-secondary)]">{Object.keys(activity.tags).join(" · ") || "No feedback tags selected"}</p><p className="mt-2 text-xs text-[var(--color-text-muted)]">Submitted {dateTime(activity.feedbackSubmittedAt)}</p></> : <p className="mt-3 text-sm text-[var(--color-text-secondary)]">No feedback submitted yet.</p>}
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="rounded-control border border-[var(--color-border)] p-3.5"><p className="text-[11px] font-semibold uppercase tracking-[.06em] text-[var(--color-text-muted)]">{label}</p><p className="mt-2 text-sm font-semibold">{value}</p>{detail && <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{detail}</p>}</div>;
}
