import { NextResponse } from "next/server";
import { getStaffPrincipal } from "@/lib/server/staff-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

type AccountInput = { accountType?: unknown; accountName?: unknown; firstName?: unknown; lastName?: unknown; email?: unknown; mobile?: unknown };

function clean(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export async function POST(request: Request) {
  const principal = await getStaffPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

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
  const mobile = clean(body.mobile);
  const accountName = accountType === "corporate" ? clean(body.accountName) : `${firstName} ${lastName}`.trim();

  if (!accountType) return NextResponse.json({ error: "Choose an account type." }, { status: 400 });
  if (accountName.length < 2 || accountName.length > 200) return NextResponse.json({ error: "Enter a valid account name." }, { status: 400 });
  if (!firstName || firstName.length > 100 || !lastName || lastName.length > 100) return NextResponse.json({ error: "Enter the primary contact's full name." }, { status: 400 });
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (mobile.length > 32 || !/^[+\d][\d\s().-]+$/.test(mobile) || mobile.replace(/\D/g, "").length < 7) return NextResponse.json({ error: "Enter a valid mobile number." }, { status: 400 });

  const admin = getSupabaseAdmin();
  const { data: existing } = await admin.from("client_profiles").select("id").eq("normalized_email", email).maybeSingle();
  if (existing) return NextResponse.json({ error: "An account already uses this email address." }, { status: 409 });

  const { data: client, error: clientError } = await admin.from("clients").insert({ name: accountName, account_type: accountType, external_ref: `cus-${crypto.randomUUID().slice(0, 12)}` }).select("id").single<{ id: string }>();
  if (clientError || !client) return NextResponse.json({ error: "Unable to create the account." }, { status: 500 });

  const { data: profile, error: profileError } = await admin.from("client_profiles").insert({ client_id: client.id, email, first_name: firstName, last_name: lastName, mobile, status: "invited" }).select("id").single<{ id: string }>();
  if (profileError || !profile) {
    await admin.from("clients").delete().eq("id", client.id);
    return NextResponse.json({ error: profileError?.code === "23505" ? "An account already uses this email address." : "Unable to create the primary contact." }, { status: profileError?.code === "23505" ? 409 : 500 });
  }

  const { error: linkError } = await admin.from("clients").update({ primary_contact_profile_id: profile.id }).eq("id", client.id);
  if (linkError) {
    await admin.from("clients").update({ primary_contact_profile_id: null }).eq("id", client.id);
    await admin.from("client_profiles").delete().eq("id", profile.id);
    await admin.from("clients").delete().eq("id", client.id);
    return NextResponse.json({ error: "Unable to securely finish creating the account." }, { status: 500 });
  }

  const { error: auditError } = await admin.from("customer_audit_log").insert({ client_id: client.id, client_profile_id: profile.id, actor_user_id: principal.userId, actor_type: "staff", action: "crm.account_created", entity_type: "client", entity_id: client.id, metadata: { account_type: accountType } });
  if (auditError) {
    await admin.from("clients").update({ primary_contact_profile_id: null }).eq("id", client.id);
    await admin.from("client_profiles").delete().eq("id", profile.id);
    await admin.from("clients").delete().eq("id", client.id);
    return NextResponse.json({ error: "Unable to securely finish creating the account." }, { status: 500 });
  }

  return NextResponse.json({ id: client.id }, { status: 201 });
}
