export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getPortalProjectDetail } from "@/lib/server/customer-portal-data";

const date = (value: string) => new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" }).format(new Date(value));
const STATUS_LABELS: Record<string, string> = { planned: "Planned", active: "Active", on_hold: "On hold", completed: "Completed", cancelled: "Cancelled", archived: "Archived" };

export default async function PortalProjectDetailPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const project = await getPortalProjectDetail(reference);
  if (!project) notFound();

  const statusLabel = STATUS_LABELS[project.status] ?? project.status.replaceAll("_", " ");
  const isActive = project.status === "active";
  const isCompleted = project.status === "completed";

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/portal/projects" className="text-sm font-semibold text-[#FF5300]">← Back to projects</Link>

      <div className="mt-5 rounded-xl border border-border bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-text-muted">{project.reference}</p>
            <h1 className="mt-1 font-display text-3xl font-semibold">{project.title}</h1>
            {project.description ? <p className="mt-2 max-w-xl text-text-secondary">{project.description}</p> : null}
          </div>
          <span className={`h-fit rounded-full px-3 py-1 text-xs font-semibold ${isCompleted ? "bg-teal-100 text-teal-800" : isActive ? "bg-success-bg text-success-text" : "bg-surface-muted text-text-secondary"}`}>
            {statusLabel}
          </span>
        </div>

        <dl className="mt-7 grid gap-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {project.startsAt ? (
            <div><dt className="text-text-muted">Started</dt><dd className="mt-1 font-semibold">{date(project.startsAt)}</dd></div>
          ) : null}
          {project.completedAt ? (
            <div><dt className="text-text-muted">Completed</dt><dd className="mt-1 font-semibold">{date(project.completedAt)}</dd></div>
          ) : null}
          {project.galleryCount > 0 ? (
            <div>
              <dt className="text-text-muted">Galleries</dt>
              <dd className="mt-1 font-semibold">
                <Link href="/portal/galleries" className="font-semibold text-[#FF5300] hover:underline">
                  {project.galleryCount} {project.galleryCount === 1 ? "gallery" : "galleries"}
                </Link>
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      {project.bookingReference ? (
        <div className="mt-5 rounded-xl border border-border bg-surface p-6">
          <h2 className="font-display text-xl font-semibold">Linked booking</h2>
          <dl className="mt-5 grid gap-5 text-sm sm:grid-cols-2">
            <div><dt className="text-text-muted">Reference</dt><dd className="mt-1 font-mono font-semibold">{project.bookingReference}</dd></div>
            {project.bookingServiceType ? <div><dt className="text-text-muted">Service</dt><dd className="mt-1 font-semibold">{project.bookingServiceType}</dd></div> : null}
            {project.bookingServiceDate ? <div><dt className="text-text-muted">Date</dt><dd className="mt-1 font-semibold">{date(project.bookingServiceDate)}</dd></div> : null}
          </dl>
          <Link href={`/portal/bookings/${project.bookingReference}`} className="mt-5 inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm font-semibold hover:border-[#FF5300]">View booking</Link>
        </div>
      ) : null}

      {project.galleryCount === 0 && isActive ? (
        <div className="mt-5 rounded-xl border border-dashed border-border bg-surface p-8">
          <h2 className="font-display text-xl font-semibold">No galleries yet</h2>
          <p className="mt-2 max-w-xl text-text-secondary">Your session photographs will appear in your galleries once they are ready for delivery.</p>
        </div>
      ) : null}
    </main>
  );
}
