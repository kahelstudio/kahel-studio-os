import { NextResponse } from "next/server";
import { consumeCustomerRateLimit } from "@/lib/server/customer-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const bookingId = url.searchParams.get("booking")?.trim() ?? "";
  const reference = url.searchParams.get("reference")?.trim() ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(bookingId) || !/^[A-Z0-9-]{1,100}$/i.test(reference)) {
    return NextResponse.json({ error: "Payment reference is invalid." }, { status: 400 });
  }
  if (!await consumeCustomerRateLimit(request, "payment_status", reference, 30, "10 minutes")) {
    return NextResponse.json({ error: "Too many payment checks. Please wait a moment." }, { status: 429 });
  }
  const result = await getSupabaseAdmin().from("bookings")
    .select("status,payment_status")
    .eq("id", bookingId)
    .eq("reference", reference)
    .maybeSingle<{ status: string; payment_status: string }>();
  if (result.error) return NextResponse.json({ error: "Payment status is temporarily unavailable." }, { status: 503 });
  if (!result.data) return NextResponse.json({ error: "Payment reference was not found." }, { status: 404 });
  const state = result.data.payment_status === "paid" || result.data.payment_status === "partially_paid"
    ? "paid"
    : result.data.payment_status === "failed" || result.data.status === "cancelled" ? "failed" : "pending";
  return NextResponse.json({ state }, { headers: { "Cache-Control": "private, no-store" } });
}
