import { connection } from "next/server";
import ProjectRecord from "./project-record";
import { EmailHistory } from "@/components/messages/email-history";
import { getProjectByRef, getProjectExpenses } from "@/lib/server/projects-data";
import { formatPeso } from "@/lib/expenses";

export default async function ProjectRecordPage({ params }: { params: Promise<{ projectRef: string }> }) {
  await connection();
  const { projectRef } = await params;
  const project = await getProjectByRef(projectRef);
  const costs = project ? await getProjectExpenses(project.id) : { total: 0, rows: [] };
  return <><ProjectRecord projectRef={projectRef} /><div className="mx-auto w-full max-w-5xl px-5 pb-5 sm:px-10"><section className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><div className="flex items-end justify-between gap-4"><div><h2 className="font-display text-xl font-semibold">Project costs</h2><p className="mt-1 text-sm text-[var(--color-text-secondary)]">Approved internal expenses. Never shown in the client portal.</p></div><strong className="font-display text-2xl tabular-nums">{formatPeso(costs.total)}</strong></div>{costs.rows.length ? <div className="mt-4 divide-y divide-[var(--color-border)]">{costs.rows.map((row) => <div key={row.reference} className="flex items-center justify-between gap-4 py-3 text-sm"><div><a href={`/expenses?ref=${row.reference}`} className="font-semibold text-[var(--color-kahel-700)]">{row.vendor}</a><p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{row.reference} · {row.category}</p></div><span className="font-semibold tabular-nums">{formatPeso(row.amount)}</span></div>)}</div> : <p className="mt-4 text-sm text-[var(--color-text-secondary)]">No approved project expenses.</p>}</section></div><div className="mx-auto w-full max-w-5xl px-5 pb-14 sm:px-10"><EmailHistory context={{ projectId: project?.id, projectReference: projectRef, bookingId: project?.bookingId ?? undefined, clientId: project?.clientId }} /></div></>;
}
