import { NextResponse } from "next/server";
import { getStaffPrincipal } from "@/lib/server/staff-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

async function adminPrincipal(request: Request) {
  const principal = await getStaffPrincipal(request);
  return principal?.role === "admin" || principal?.role === "super_admin" ? principal : null;
}

type PromoCodeRecord = {
  id: string;
  label: string;
  description: string | null;
  type: string;
  value: number;
  currency: string;
  status: string;
  usage_limit: number | null;
  max_uses_per_customer: number | null;
  valid_until: string | null;
  applicable_services: string[] | null;
  excluded_services: string[] | null;
  minimum_booking_amount: number | null;
  maximum_discount_amount: number | null;
};

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await adminPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Administrative access is required." }, { status: 403 });
  const { id } = await params;
  const result = await getSupabaseAdmin().from("promo_codes").select("*").eq("id", id).maybeSingle();
  if (result.error) return NextResponse.json({ error: "Unable to load promo code." }, { status: 500 });
  if (!result.data) return NextResponse.json({ error: "Promo code not found." }, { status: 404 });
  return NextResponse.json({ promoCode: result.data });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await adminPrincipal(request);
  if (!principal?.userId) return NextResponse.json({ error: "An authenticated administrative actor is required." }, { status: 403 });
  const { id } = await params;
  const rawBody = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!rawBody) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const admin = getSupabaseAdmin();
  const existing = await admin.from("promo_codes").select("*").eq("id", id).maybeSingle<PromoCodeRecord>();
  if (existing.error) return NextResponse.json({ error: "Unable to load promo code." }, { status: 500 });
  if (!existing.data) return NextResponse.json({ error: "Promo code not found." }, { status: 404 });

  const current = existing.data;
  const label = typeof rawBody.label === "string" ? rawBody.label : current.label;
  const description = typeof rawBody.description === "string" ? rawBody.description : current.description;
  const type = typeof rawBody.type === "string" ? rawBody.type : current.type;
  const value = typeof rawBody.value === "number" ? rawBody.value : Number(current.value);
  const currency = typeof rawBody.currency === "string" ? rawBody.currency : current.currency;
  const usageLimit = rawBody.usageLimit === null ? null : typeof rawBody.usageLimit === "number" ? rawBody.usageLimit : current.usage_limit;
  const maxUsesPerCustomer = rawBody.maxUsesPerCustomer === null ? null : typeof rawBody.maxUsesPerCustomer === "number" ? rawBody.maxUsesPerCustomer : current.max_uses_per_customer;
  const validUntil = rawBody.validUntil === null ? null : typeof rawBody.validUntil === "string" ? rawBody.validUntil : current.valid_until;
  const applicableServices = Array.isArray(rawBody.applicableServices) ? rawBody.applicableServices as string[] : current.applicable_services ?? [];
  const excludedServices = Array.isArray(rawBody.excludedServices) ? rawBody.excludedServices as string[] : current.excluded_services ?? [];
  const minimumBookingAmount = rawBody.minimumBookingAmount === null ? null : typeof rawBody.minimumBookingAmount === "number" ? rawBody.minimumBookingAmount : current.minimum_booking_amount;
  const maximumDiscountAmount = rawBody.maximumDiscountAmount === null ? null : typeof rawBody.maximumDiscountAmount === "number" ? rawBody.maximumDiscountAmount : current.maximum_discount_amount;
  const status = typeof rawBody.status === "string" ? rawBody.status : current.status;

  if (!["percentage", "fixed_amount", "free_addon"].includes(type)) {
    return NextResponse.json({ error: "Invalid promo code type." }, { status: 400 });
  }
  if (!["active", "inactive", "expired", "exhausted"].includes(status)) {
    return NextResponse.json({ error: "Invalid promo code status." }, { status: 400 });
  }
  if (!Number.isFinite(value) || value <= 0) {
    return NextResponse.json({ error: "value must be a positive number." }, { status: 400 });
  }

  const result = await admin.rpc("promo_code_update", {
    requested_id: id,
    requested_label: label,
    requested_description: description,
    requested_type: type,
    requested_value: value,
    requested_currency: currency ?? "PHP",
    requested_usage_limit: usageLimit,
    requested_max_uses_per_customer: maxUsesPerCustomer,
    requested_valid_until: validUntil,
    requested_applicable_services: applicableServices,
    requested_excluded_services: excludedServices,
    requested_minimum_booking_amount: minimumBookingAmount,
    requested_maximum_discount_amount: maximumDiscountAmount,
    requested_status: status,
    requested_actor_user_id: principal.userId,
  });
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 409 });
  return NextResponse.json({ promoCode: result.data });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await adminPrincipal(request);
  if (!principal?.userId) return NextResponse.json({ error: "An authenticated administrative actor is required." }, { status: 403 });
  const { id } = await params;
  const admin = getSupabaseAdmin();
  const result = await admin.rpc("promo_code_retire", { requested_id: id, requested_actor_user_id: principal.userId });
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 409 });
  return NextResponse.json({ success: true });
}
