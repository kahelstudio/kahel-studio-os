import { NextResponse } from "next/server";
import { bookingConflictMessage, isBookingSlotConflict } from "@/lib/server/booking-slots";
import { consumeCustomerRateLimit, getCustomerIdentityFromRequest, hasTrustedOrigin } from "@/lib/server/customer-auth";
import { createRewardBooking } from "@/lib/server/loyalty";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const identity = await getCustomerIdentityFromRequest(request);
  if (!identity) return NextResponse.json({ error: "Customer authorization required." }, { status: 401 });
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 8_192) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    let body: Record<string, unknown>;
    try { body = await request.json() as Record<string, unknown>; }
    catch { return NextResponse.json({ error: "Enter valid reward booking details." }, { status: 400 }); }
    const { rewardId, startsAt, holdId, holdOwnerKey, location, idempotencyKey } = body;
    if (![rewardId, startsAt, holdId, holdOwnerKey, location, idempotencyKey].every((value) => typeof value === "string") ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(rewardId)) ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(String(startsAt)) || Number.isNaN(Date.parse(String(startsAt))) ||
      !/^[0-9a-f-]{36}$/i.test(String(holdId)) || String(holdOwnerKey).length < 16 || String(holdOwnerKey).length > 200 ||
      String(location).trim().length === 0 || String(location).trim().length > 500 || String(idempotencyKey).length < 8 || String(idempotencyKey).length > 200) {
      return NextResponse.json({ error: "Enter valid reward booking details." }, { status: 400 });
    }
    if (!await consumeCustomerRateLimit(request, "loyalty_redeem", identity.email, 12, "1 hour")) {
      return NextResponse.json({ error: "Too many reservation attempts. Please wait before trying again." }, { status: 429 });
    }
    const booking = await createRewardBooking({ clientId: identity.clientId, profileId: identity.profileId, rewardId: String(rewardId), startsAt: String(startsAt), holdId: String(holdId), holdOwnerKey: String(holdOwnerKey), location: String(location), idempotencyKey: String(idempotencyKey) });
    return NextResponse.json({ bookingRef: booking.reference }, { status: 201 });
  } catch (error) {
    if (isBookingSlotConflict(error)) return NextResponse.json({ error: bookingConflictMessage(), conflict: true }, { status: 409 });
    console.error("Loyalty reward booking failed:", error);
    return NextResponse.json({ error: "This reward is unavailable or could not be reserved." }, { status: 409 });
  }
}
