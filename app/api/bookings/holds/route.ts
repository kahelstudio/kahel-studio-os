import { NextResponse } from "next/server";
import { resolveBookableService, sha256 } from "@/lib/server/booking-availability";
import { bookingConflictMessage, isBookingSlotConflict } from "@/lib/server/booking-slots";
import { auditCustomerEvent, consumeCustomerRateLimit, hasTrustedOrigin } from "@/lib/server/customer-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

type HoldRequest = {
  service?: unknown;
  startsAt?: unknown;
  ownerKey?: unknown;
  idempotencyKey?: unknown;
  resourceId?: unknown;
  durationMinutes?: unknown;
};

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Unable to reserve this time." }, { status: 403 });
  let input: HoldRequest;
  try { input = await request.json() as HoldRequest; }
  catch { return NextResponse.json({ error: "Invalid hold request." }, { status: 400 }); }
  if (typeof input.service !== "string" || typeof input.startsAt !== "string" || Number.isNaN(Date.parse(input.startsAt)) ||
      typeof input.ownerKey !== "string" || input.ownerKey.length < 16 || input.ownerKey.length > 200 ||
      typeof input.idempotencyKey !== "string" || input.idempotencyKey.length < 8 || input.idempotencyKey.length > 200 ||
      (input.durationMinutes != null && (!Number.isInteger(input.durationMinutes) || Number(input.durationMinutes) < 1 || Number(input.durationMinutes) > 960)) ||
      (input.resourceId != null && (typeof input.resourceId !== "string" || !/^[0-9a-f-]{36}$/i.test(input.resourceId)))) {
    return NextResponse.json({ error: "Invalid hold request." }, { status: 400 });
  }
  try {
    if (!await consumeCustomerRateLimit(request, "booking_hold", input.ownerKey, 12, "1 hour")) {
      await auditCustomerEvent({ action: "booking_hold_rate_limited", actorType: "system", entityType: "booking_reservation" });
      return NextResponse.json({ error: "Too many reservation attempts. Please wait before trying again." }, { status: 429 });
    }
    const service = await resolveBookableService(input.service);
    if (!service) return NextResponse.json({ error: "This service is unavailable." }, { status: 404 });
    const ownerTokenHash = await sha256(input.ownerKey);
    const fingerprint = await sha256(JSON.stringify({ serviceId: service.id, startsAt: input.startsAt, resourceId: input.resourceId ?? null, durationMinutes: input.durationMinutes ?? null, ownerTokenHash }));
    const result = await getSupabaseAdmin().rpc("acquire_booking_hold", {
      requested_service_id: service.id,
      requested_starts_at: input.startsAt,
      requested_idempotency_key: input.idempotencyKey,
      requested_fingerprint: fingerprint,
      requested_owner_token_hash: ownerTokenHash,
      requested_resource_id: input.resourceId ?? null,
      requested_hold_minutes: null,
      requested_duration_minutes: input.durationMinutes == null ? null : Number(input.durationMinutes),
    });
    if (result.error) throw result.error;
    const hold = result.data as unknown as { reservation_id: string; status: string; starts_at: string; ends_at: string; expires_at: string; server_time: string; idempotent_replay: boolean };
    if (hold.status !== "held" || Date.parse(hold.expires_at) <= Date.parse(hold.server_time)) {
      return NextResponse.json({ error: "This reservation hold expired. Choose the time again.", conflict: true }, { status: 409 });
    }
    await auditCustomerEvent({ action: hold.idempotent_replay ? "booking_hold_replayed" : "booking_hold_created", actorType: "system", entityType: "booking_reservation", entityId: hold.reservation_id, metadata: { service_id: service.id, starts_at: hold.starts_at, expires_at: hold.expires_at } });
    return NextResponse.json({
      holdId: hold.reservation_id,
      status: hold.status,
      startsAt: hold.starts_at,
      endsAt: hold.ends_at,
      expiresAt: hold.expires_at,
      serverTime: hold.server_time,
      idempotentReplay: hold.idempotent_replay,
    }, { status: hold.idempotent_replay ? 200 : 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isBookingSlotConflict(error)) {
      await auditCustomerEvent({ action: "booking_conflict_rejected", actorType: "system", entityType: "booking_reservation" });
      return NextResponse.json({ error: bookingConflictMessage(), conflict: true }, { status: 409 });
    }
    console.error("Booking hold failed:", error);
    return NextResponse.json({ error: "Unable to reserve this time. Refresh availability and try again." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Unable to release this hold." }, { status: 403 });
  let input: { holdId?: unknown; ownerKey?: unknown };
  try { input = await request.json() as { holdId?: unknown; ownerKey?: unknown }; }
  catch { return NextResponse.json({ error: "Invalid hold release." }, { status: 400 }); }
  if (typeof input.holdId !== "string" || !/^[0-9a-f-]{36}$/i.test(input.holdId) || typeof input.ownerKey !== "string" || input.ownerKey.length < 16 || input.ownerKey.length > 200) {
    return NextResponse.json({ error: "Invalid hold release." }, { status: 400 });
  }
  const result = await getSupabaseAdmin().rpc("release_booking_hold", {
    requested_reservation_id: input.holdId,
    requested_owner_token_hash: await sha256(input.ownerKey),
  });
  if (result.error) return NextResponse.json({ error: "The hold could not be released." }, { status: 409 });
  return NextResponse.json({ released: true }, { headers: { "Cache-Control": "no-store" } });
}
