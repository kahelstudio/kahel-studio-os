import { notFound } from "next/navigation";
import { BOOKINGS_BY_REF } from "@/lib/sample-data";
import { BookingDetailClient } from "./booking-detail-client";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  const booking = BOOKINGS_BY_REF[ref];
  if (!booking) notFound();

  return <BookingDetailClient booking={booking} />;
}
