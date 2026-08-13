export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getRealBookingByRef } from "@/lib/server/bookings-data";
import { type BookingRow } from "@/lib/sample-data";
import { BookingDetailClient } from "./booking-detail-client";
import { EmailHistory } from "@/components/messages/email-history";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  const booking = await getRealBookingByRef(ref);
  if (!booking) notFound();

  return <><BookingDetailClient booking={booking as unknown as BookingRow} /><div className="max-w-[1040px] px-4 pb-10 sm:px-6 xl:px-10"><EmailHistory context={{ bookingId: booking.id, bookingReference: booking.ref, clientId: booking.accountId }} /></div></>;
}
