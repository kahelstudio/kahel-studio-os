import { NextResponse } from "next/server";
import { getStaffPrincipal } from "@/lib/server/staff-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

async function adminPrincipal(request: Request) {
  const principal = await getStaffPrincipal(request);
  return principal?.role === "admin" || principal?.role === "super_admin" ? principal : null;
}

export async function GET(request: Request) {
  const principal = await adminPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Administrative access is required." }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
  const offset = parseInt(searchParams.get("offset") ?? "0");
  const query = getSupabaseAdmin().from("promo_codes").select("*").order("created_at", { ascending: false }).range(offset, offset + limit - 1);
  if (status && status !== "all") query.eq("status", status);
  const result = await query;
  if (result.error) return NextResponse.json({ error: "Unable to load promo codes." }, { status: 500 });
  return NextResponse.json({ promoCodes: result.data ?? [] });
}

export async function POST(request: Request) {
  const principal = await adminPrincipal(request);
  if (!principal?.userId) return NextResponse.json({ error: "An authenticated administrative actor is required." }, { status: 403 });
  const rawBody = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!rawBody) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const code = rawBody.code as string | undefined;
  const label = rawBody.label as string | undefined;
  const description = rawBody.description as string | undefined;
  const type = rawBody.type as string | undefined;
  const value = rawBody.value as number | undefined;
  const currency = rawBody.currency as string | undefined;
  const usageLimit = rawBody.usageLimit as number | undefined;
  const maxUsesPerCustomer = rawBody.maxUsesPerCustomer as number | undefined;
  const validUntil = rawBody.validUntil as string | undefined;
  const applicableServices = rawBody.applicableServices as string[] | undefined;
  const excludedServices = rawBody.excludedServices as string[] | undefined;
  const minimumBookingAmount = rawBody.minimumBookingAmount as number | undefined;
  const maximumDiscountAmount = rawBody.maximumDiscountAmount as number | undefined;

  if (!code || !label || !type || typeof value !== "number") {
    return NextResponse.json({ error: "code, label, type, and value are required." }, { status: 400 });
  }
  if (!["percentage", "fixed_amount", "free_addon"].includes(type)) {
    return NextResponse.json({ error: "Invalid promo code type." }, { status: 400 });
  }
  const admin = getSupabaseAdmin();
  const result = await admin.rpc("promo_code_create", {
    requested_code: code,
    requested_label: label,
    requested_description: description ?? null,
    requested_type: type,
    requested_value: value,
    requested_currency: currency ?? "PHP",
    requested_usage_limit: usageLimit ?? null,
    requested_max_uses_per_customer: maxUsesPerCustomer ?? null,
    requested_valid_until: validUntil ?? null,
    requested_applicable_services: applicableServices ?? [],
    requested_excluded_services: excludedServices ?? [],
    requested_minimum_booking_amount: minimumBookingAmount ?? null,
    requested_maximum_discount_amount: maximumDiscountAmount ?? null,
    requested_actor_user_id: principal.userId,
  });
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 409 });
  return NextResponse.json({ promoCode: result.data }, { status: 201 });
}