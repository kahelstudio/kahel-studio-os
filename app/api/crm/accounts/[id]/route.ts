import { NextResponse } from "next/server";
import { normalizePhilippinePhone } from "@/lib/operation-rules";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { getStaffPrincipal } from "@/lib/server/staff-auth";

export const runtime = "nodejs";

type AccountInput = { accountType?: unknown; accountName?: unknown; firstName?: unknown; lastName?: unknown; email?: unknown; mobile?: unknown };
type ClientRecord = { id: string; name: string; account_type: string; primary_contact_profile_id: string | null };
type ProfileRecord = { id: string; email: string; first_name: string; last_name: string; mobile: string | null };

function clean(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getStaffPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!principal.permissions.includes("bookings.manage")) return NextResponse.json({ error: "Booking management permission is required." }, { status: 403 });

  let body: AccountInput;
  try {
    body = await request.json() as AccountInput;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const accountType = body.accountType === "corporate" ? "corporate" : body.accountType === "consumer" ? "consumer" : "";
  const firstName = clean(body.firstName);
  const lastName = clean(body.lastName);
  const email = clean(body.email).toLowerCase();
  const mobile = normalizePhilippinePhone(clean(body.mobile));
  const accountName = accountType === "corporate" ? clean(body.accountName) : `${firstName} ${lastName}`.trim();

  if (!accountType) return NextResponse.json({ error: "Choose an account type." }, { status: 400 });
  if (accountName.length < 2 || accountName.length > 200) return NextResponse.json({ error: "Enter a valid account name." }, { status: 400 });
  if (!firstName || firstName.length > 100 || !lastName || lastName.length > 100) return NextResponse.json({ error: "Enter the primary contact's full name." }, { status: 400 });
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (!mobile) return NextResponse.json({ error: "Enter a valid mobile number." }, { status: 400 });

  const { id } = await params;
  const admin = getSupabaseAdmin();
  const { data: client, error: clientError } = await admin.from("clients").select("id,name,account_type,primary_contact_profile_id").eq("id", id).maybeSingle<ClientRecord>();
  if (clientError || !client) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  if (!client.primary_contact_profile_id) return NextResponse.json({ error: "This account does not have a primary contact to edit." }, { status: 409 });

  const { data: profile, error: profileError } = await admin.from("client_profiles").select("id,email,first_name,last_name,mobile").eq("id", client.primary_contact_profile_id).eq("client_id", client.id).maybeSingle<ProfileRecord>();
  if (profileError || !profile) return NextResponse.json({ error: "Primary contact not found." }, { status: 404 });

  const { data: emailOwner } = await admin.from("client_profiles").select("id").eq("normalized_email", email).neq("id", profile.id).maybeSingle<{ id: string }>();
  if (emailOwner) return NextResponse.json({ error: "Another account already uses this email address." }, { status: 409 });
  const { data: phoneOwner } = await admin.from("client_profiles").select("id").eq("normalized_mobile", mobile).neq("id", profile.id).maybeSingle<{ id: string }>();
  if (phoneOwner) return NextResponse.json({ error: "Another account already uses this phone number." }, { status: 409 });

  const { error: contactUpdateError } = await admin.from("client_profiles").update({ first_name: firstName, last_name: lastName, email, mobile }).eq("id", profile.id).eq("client_id", client.id);
  if (contactUpdateError) return NextResponse.json({ error: contactUpdateError.code === "23505" ? "Another account already uses this email or phone number." : "Unable to update the primary contact." }, { status: contactUpdateError.code === "23505" ? 409 : 500 });

  const { error: accountUpdateError } = await admin.from("clients").update({ name: accountName, account_type: accountType }).eq("id", client.id);
  if (accountUpdateError) {
    await admin.from("client_profiles").update({ first_name: profile.first_name, last_name: profile.last_name, email: profile.email, mobile: profile.mobile }).eq("id", profile.id).eq("client_id", client.id);
    return NextResponse.json({ error: "Unable to update the account." }, { status: 500 });
  }

  const { error: auditError } = await admin.from("customer_audit_log").insert({ client_id: client.id, client_profile_id: profile.id, actor_user_id: principal.userId, actor_type: "staff", action: "crm.account_updated", entity_type: "client", entity_id: client.id, metadata: { account_type: accountType } });
  if (auditError) {
    await admin.from("clients").update({ name: client.name, account_type: client.account_type }).eq("id", client.id);
    await admin.from("client_profiles").update({ first_name: profile.first_name, last_name: profile.last_name, email: profile.email, mobile: profile.mobile }).eq("id", profile.id).eq("client_id", client.id);
    return NextResponse.json({ error: "Unable to securely finish updating the account." }, { status: 500 });
  }

  return NextResponse.json({ updated: true });
}
