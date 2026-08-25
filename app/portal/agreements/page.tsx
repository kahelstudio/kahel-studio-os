import Link from "next/link";
import { requireCustomerIdentity } from "@/lib/server/customer-auth";
import { listClientAgreements } from "@/lib/server/legal-documents";

export const dynamic = "force-dynamic";

export default async function PortalAgreementsPage() {
  const identity = await requireCustomerIdentity("/portal/agreements");
  const agreements = await listClientAgreements(identity.clientId);
  return <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6"><h1 className="font-display text-4xl font-semibold">Agreements</h1><p className="mt-2 text-text-secondary">Your accepted booking terms and customer-accessible agreement history.</p><div className="mt-8 grid gap-4">{agreements.length ? agreements.map((agreement) => { const summary = agreement.booking_summary as { reference?: string; service_type?: string }; return <article key={agreement.id} className="rounded-xl border border-border bg-surface p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-mono text-xs text-text-muted">{summary.reference ?? agreement.booking_id}</p><h2 className="mt-1 font-display text-xl font-semibold">Booking Terms and Conditions</h2><p className="mt-2 text-sm text-text-secondary">Version {agreement.version_number} · Accepted {new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(agreement.accepted_at))}</p></div><Link href={`/portal/agreements/${agreement.id}`} className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm font-semibold hover:border-[#FF5300]">View accepted terms</Link></div></article>; }) : <p className="rounded-xl border border-dashed border-border p-8 text-text-secondary">No accepted agreements yet.</p>}</div></main>;
}
