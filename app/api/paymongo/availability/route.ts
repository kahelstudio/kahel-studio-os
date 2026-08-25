import { NextResponse } from "next/server";
import { getBookingAvailability, resolveBookableService } from "@/lib/server/booking-availability";
import { auditCustomerEvent, consumeCustomerRateLimit } from "@/lib/server/customer-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const serviceInput = url.searchParams.get("service")?.trim() ?? "";
  const date = url.searchParams.get("date")?.trim() ?? "";
  const requestedDuration = url.searchParams.get("duration");
  const durationMinutes = requestedDuration == null ? null : Number(requestedDuration);
  if (!serviceInput || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Choose a service and date to view availability." }, { status: 400 });
  }
  if (durationMinutes !== null && (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 960)) {
    return NextResponse.json({ error: "Invalid booking duration." }, { status: 400 });
  }
  try {
    if (!await consumeCustomerRateLimit(request, "booking_availability", "public", 120, "10 minutes")) {
      await auditCustomerEvent({ action: "booking_availability_rate_limited", actorType: "system", entityType: "booking_availability", metadata: { service: serviceInput, date } });
      return NextResponse.json({ error: "Too many availability requests. Please wait a moment." }, { status: 429 });
    }
    const service = await resolveBookableService(serviceInput);
    if (!service) return NextResponse.json({ error: "This service is unavailable." }, { status: 404 });
    const availability = await getBookingAvailability(service.id, date, url.searchParams.get("resource"), durationMinutes);
    await auditCustomerEvent({ action: "booking_availability_checked", actorType: "system", entityType: "booking_availability", entityId: availability.resource.id, metadata: { service_id: service.id, date, available_slots: availability.slots.filter((slot) => slot.available).length } });
    return NextResponse.json(availability, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Booking availability failed:", error);
    return NextResponse.json({ error: "Availability could not be loaded. Please try again." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
