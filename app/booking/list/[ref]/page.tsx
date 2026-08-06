export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getRealBookingByRef } from "@/lib/server/bookings-data";
import { type BookingRow } from "@/lib/sample-data";
import { BookingDetailClient } from "./booking-detail-client";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  const booking = await getRealBookingByRef(ref);
  if (!booking) notFound();

  return <BookingDetailClient booking={booking as unknown as BookingRow} />;
}