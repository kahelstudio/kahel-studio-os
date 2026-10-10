export const dynamic = "force-dynamic";

import Link from "next/link";
import { getPortalProjects } from "@/lib/server/customer-portal-data";

const STATUS_LABELS: Record<string, string> = { planned: "Planned", active: "Active", on_hold: "On hold", completed: "Completed", cancelled: "Cancelled", archived: "Archived" };

export default async function PortalProjectsPage() {
  const rows = await getPortalProjects();
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-semibold">Projects</h1>
      <p className="mt-2 text-text-secondary">Production status and approved delivery access.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {rows.length ? rows.map((row) => (
          <Link key={row.id} href={`/portal/projects/${row.reference}`} className="rounded-xl border border-border bg-surface p-5 transition-colors hover:border-kahel-500 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#FF5300]/30">
            <div className="flex items-start justify-between gap-3">
              <span className="font-mono text-xs text-text-muted">{row.reference}</span>
              <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-text-secondary">{STATUS_LABELS[row.status] ?? row.status.replaceAll("_", " ")}</span>
            </div>
            <h2 className="mt-2 font-display text-xl font-semibold">{row.title}</h2>
            {row.description ? <p className="mt-2 line-clamp-2 text-sm text-text-secondary">{row.description}</p> : null}
            <span className="mt-4 block text-sm font-semibold text-kahel-700">View details →</span>
          </Link>
        )) : (
          <p className="rounded-xl border border-dashed border-border p-8 text-text-secondary sm:col-span-2">Projects will appear after a booking is confirmed.</p>
        )}
      </div>
    </main>
  );
}
