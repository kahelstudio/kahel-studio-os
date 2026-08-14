import Link from "next/link";
import { notFound } from "next/navigation";
import { PortalAgreementAcceptance } from "@/components/legal/portal-agreement-acceptance";
import { getPortalBooking } from "@/lib/server/customer-portal-data";
import { getBookingTermsVersion, getCurrentBookingTerms } from "@/lib/server/legal-documents";

export const dynamic = "force-dynamic";
const peso = (centavos: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(centavos / 100);

export default async function PortalBookingPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const { booking } = await getPortalBooking(reference);
  if (!booking) notFound();
  const requiredVersion = booking.agreementStatus === "pending" && booking.agreementVersionId ? await getBookingTermsVersion(booking.agreementVersionId) : booking.agreementStatus === "unavailable" ? await getCurrentBookingTerms() : null;
  const acceptanceVersion = requiredVersion && "contentHash" in requiredVersion ? { id: requiredVersion.id, hash: requiredVersion.contentHash, label: requiredVersion.versionLabel, effective: requiredVersion.effectiveDate } : requiredVersion?.effective_date ? { id: requiredVersion.id, hash: requiredVersion.content_hash, label: requiredVersion.version_label, effective: requiredVersion.effective_date } : null;
  return <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6"><Link href="/portal/bookings" className="text-sm font-semibold text-[#FF5300]">Back to bookings</Link><div className="mt-5 rounded-xl border border-border bg-surface p-6"><div className="flex flex-wrap justify-between gap-4"><div><p className="font-mono text-xs text-text-muted">{booking.reference}</p><h1 className="mt-1 font-display text-3xl font-semibold">{booking.serviceType}</h1></div><span className="h-fit rounded-full bg-kahel-100 px-3 py-1 text-xs font-semibold text-kahel-700">{booking.status.replaceAll("_", " ")}</span></div><dl className="mt-7 grid gap-5 text-sm sm:grid-cols-2"><div><dt className="text-text-muted">Schedule</dt><dd className="mt-1 font-semibold">{booking.serviceDate} · {booking.serviceTime.slice(0, 5)}</dd></div><div><dt className="text-text-muted">Location</dt><dd className="mt-1 font-semibold">{booking.location}</dd></div><div><dt className="text-text-muted">Total</dt><dd className="mt-1 font-semibold">{peso(booking.totalAmount)}</dd></div><div><dt className="text-text-muted">Terms</dt><dd className="mt-1 font-semibold">{booking.agreementStatus === "accepted" ? `Accepted · Version ${booking.agreementVersion}` : booking.agreementStatus.replaceAll("_", " ")}</dd></div></dl>{booking.agreementId ? <Link href={`/portal/agreements/${booking.agreementId}`} className="mt-6 inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm font-semibold hover:border-[#FF5300]">View accepted terms</Link> : null}</div>{acceptanceVersion ? <PortalAgreementAcceptance bookingId={booking.id} versionId={acceptanceVersion.id} contentHash={acceptanceVersion.hash} versionLabel={acceptanceVersion.label} effectiveDate={acceptanceVersion.effective} /> : null}</main>;
}
