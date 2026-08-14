export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getRealBookingByRef } from "@/lib/server/bookings-data";
import { type BookingRow } from "@/lib/sample-data";
import { BookingDetailClient } from "./booking-detail-client";
import { EmailHistory } from "@/components/messages/email-history";
import Link from "next/link";
import { getBookingAgreement } from "@/lib/server/legal-documents";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  const booking = await getRealBookingByRef(ref);
  if (!booking) notFound();
  const agreement = await getBookingAgreement(booking.id, booking.accountId);

  return <><BookingDetailClient booking={booking as unknown as BookingRow} /><div className="max-w-[1040px] px-4 pb-10 sm:px-6 xl:px-10"><section className="mb-6 rounded-card border border-border bg-surface p-5"><h2 className="font-display text-xl font-semibold">Agreements</h2>{agreement ? <div className="mt-4 flex flex-wrap items-center justify-between gap-4"><div><p className="font-semibold">Booking Terms and Conditions · {agreement.version.version_label}</p><p className="mt-1 text-sm text-text-secondary">Accepted {new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(agreement.acceptance.accepted_at))} · {agreement.acceptance.method}</p><p className="mt-1 font-mono text-[10px] text-text-muted">SHA-256 {agreement.acceptance.document_hash}</p></div><Link href={`/settings/legal/booking-terms#version-${agreement.version.id}`} className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm font-semibold">View version record</Link></div> : <div className="mt-4 rounded-md bg-warning-bg p-4"><p className="font-semibold text-warning-text">Awaiting customer acceptance</p><p className="mt-1 text-sm text-warning-text">Staff cannot accept silently for the customer. Send the customer to their secure Client Portal booking details.</p></div>}</section><EmailHistory context={{ bookingId: booking.id, bookingReference: booking.ref, clientId: booking.accountId }} /></div></>;
}
