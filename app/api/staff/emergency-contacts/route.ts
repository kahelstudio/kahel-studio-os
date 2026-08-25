import { NextResponse } from "next/server";
import { authenticationDisabled, getStaffPrincipal } from "@/lib/server/staff-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

type ContactInput = {
  name?: unknown;
  relationship?: unknown;
  phone?: unknown;
  email?: unknown;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function validEmail(value: string) {
  return !value || (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254);
}

function validPhone(value: string) {
  return value.length <= 30 && /^[+\d][\d\s().-]+$/.test(value) && value.replace(/\D/g, "").length >= 7;
}

async function authenticatedStaff(request: Request) {
  const principal = await getStaffPrincipal(request);
  if (!principal) return null;
  if (principal.userId) return { ...principal, userId: principal.userId };

  const { data } = await getSupabaseAdmin().from("staff_profiles").select("user_id").limit(1).maybeSingle();
  return data?.user_id ? { ...principal, userId: data.user_id } : null;
}

export async function GET(request: Request) {
  if (authenticationDisabled()) return NextResponse.json({ contacts: [] });
  const principal = await authenticatedStaff(request);
  if (!principal) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { data, error } = await getSupabaseAdmin()
    .from("staff_emergency_contacts")
    .select("id,name,relationship,phone,email,created_at")
    .eq("staff_id", principal.userId)
    .order("created_at");

  if (error) return NextResponse.json({ error: "Unable to load emergency contacts." }, { status: 500 });
  return NextResponse.json({ contacts: data });
}

export async function POST(request: Request) {
  const principal = await authenticatedStaff(request);
  if (!principal) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  let body: ContactInput;
  try {
    body = await request.json() as ContactInput;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = clean(body.name);
  const relationship = clean(body.relationship);
  const phone = clean(body.phone);
  const email = clean(body.email).toLowerCase();

  if (name.length < 2 || name.length > 120) return NextResponse.json({ error: "Enter the contact's full name." }, { status: 400 });
  if (relationship.length < 2 || relationship.length > 80) return NextResponse.json({ error: "Enter their relationship to you." }, { status: 400 });
  if (!validPhone(phone)) return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
  if (!validEmail(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  const admin = getSupabaseAdmin();
  const { data: contact, error } = await admin.from("staff_emergency_contacts").insert({
    staff_id: principal.userId,
    name,
    relationship,
    phone,
    email: email || null,
  }).select("id,name,relationship,phone,email,created_at").single();

  if (error || !contact) return NextResponse.json({ error: "Unable to add the emergency contact." }, { status: 500 });

  const { error: auditError } = await admin.from("staff_audit_log").insert({
    actor_id: principal.userId,
    actor_name: principal.email,
    event: "Added an emergency contact",
    event_type: "data",
    entity_type: "staff_emergency_contact",
    entity_id: contact.id,
    metadata: { staff_id: principal.userId },
    ip_address: request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  });

  if (auditError) {
    await admin.from("staff_emergency_contacts").delete().eq("id", contact.id).eq("staff_id", principal.userId);
    return NextResponse.json({ error: "Unable to securely record this change." }, { status: 500 });
  }

  return NextResponse.json({ contact }, { status: 201 });
}
