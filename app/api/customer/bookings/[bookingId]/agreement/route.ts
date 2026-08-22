import { NextResponse } from "next/server";
import { getCustomerIdentityFromRequest, hasTrustedOrigin } from "@/lib/server/customer-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export async function POST(request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Unable to accept this agreement." }, { status: 403 });
  const identity = await getCustomerIdentityFromRequest(request);
  if (!identity) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { bookingId } = await params;
  const body = await request.json().catch(() => null) as { accepted?: unknown; versionId?: unknown; contentHash?: unknown } | null;
  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim();
  if (!body || body.accepted !== true || typeof body.versionId !== "string" || typeof body.contentHash !== "string" || !idempotencyKey || idempotencyKey.length < 8) return NextResponse.json({ error: "Review and accept the required terms." }, { status: 400 });
  const booking = await getSupabaseAdmin().from("bookings").select("id").eq("id", bookingId).eq("client_id", identity.clientId).eq("client_profile_id", identity.profileId).maybeSingle();
  if (booking.error || !booking.data) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  const result = await getSupabaseAdmin().rpc("accept_booking_agreement", { requested_booking_id: bookingId, requested_user_id: identity.user.id, requested_version_id: body.versionId, requested_document_hash: body.contentHash, requested_idempotency_key: idempotencyKey, requested_method: "checkbox", requested_source: "customer_portal", requested_environment: ["production", "staging", "development", "test"].includes(String(process.env.APP_ENV)) ? String(process.env.APP_ENV) : "development", requested_locale: request.headers.get("accept-language")?.split(",")[0]?.slice(0, 35) || "en-PH", requested_evidence_metadata: { request_id: request.headers.get("cf-ray")?.slice(0, 100) || crypto.randomUUID(), channel: "web" } });
  if (result.error) return NextResponse.json({ error: "The agreement could not be accepted. Refresh and review the current version." }, { status: 409 });
  return NextResponse.json({ acceptanceId: result.data.id, acceptedAt: result.data.accepted_at });
}
