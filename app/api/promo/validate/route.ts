import { NextResponse } from "next/server";
import { getCustomerIdentityFromRequest } from "@/lib/server/customer-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export async function POST(request: Request) {
  const identity = await getCustomerIdentityFromRequest(request);
  if (!identity) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const rawBody = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!rawBody) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const code = rawBody.code as string | undefined;
  const bookingAmount = rawBody.bookingAmount as number | undefined;
  const serviceId = rawBody.serviceId as string | undefined;

  if (!code || typeof bookingAmount !== "number") {
    return NextResponse.json({ error: "code and bookingAmount are required." }, { status: 400 });
  }
  const admin = getSupabaseAdmin();
  const result = await admin.rpc("validate_promo_code", {
    requested_code: code,
    requested_client_id: identity.clientId,
    requested_booking_amount: bookingAmount,
    requested_service_id: serviceId ?? null,
  });
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json(result.data);
}