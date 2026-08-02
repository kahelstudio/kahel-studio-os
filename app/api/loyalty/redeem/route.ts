import { NextResponse } from "next/server";
import { getCustomerIdentityFromRequest, hasTrustedOrigin } from "@/lib/server/customer-auth";
import { createRewardBooking } from "@/lib/server/loyalty";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const identity = await getCustomerIdentityFromRequest(request);
  if (!identity) return NextResponse.json({ error: "Customer authorization required." }, { status: 401 });
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 8_192) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    const body = await request.json() as Record<string, unknown>;
    const { rewardId, date, time, location, idempotencyKey } = body;
    if (![rewardId, date, time, location, idempotencyKey].every((value) => typeof value === "string") || !/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || !/^\d{2}:\d{2}$/.test(String(time)) || String(location).trim().length > 500 || String(idempotencyKey).length > 200) {
      return NextResponse.json({ error: "Enter valid reward booking details." }, { status: 400 });
    }
    const booking = await createRewardBooking({ clientId: identity.clientId, profileId: identity.profileId, rewardId: String(rewardId), date: String(date), time: String(time), location: String(location), idempotencyKey: String(idempotencyKey) });
    return NextResponse.json({ bookingRef: booking.reference }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "This reward is unavailable or could not be reserved." }, { status: 409 });
  }
}
