import { NextResponse } from "next/server";
import { auditCustomerEvent, getCustomerIdentityFromRequest, hasTrustedOrigin, normalizeMobile } from "@/lib/server/customer-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Unable to update profile." }, { status: 403 });
  const identity = await getCustomerIdentityFromRequest(request);
  if (!identity) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  let input: { firstName?: unknown; lastName?: unknown; mobile?: unknown };
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Invalid profile." }, { status: 400 }); }
  const firstName = typeof input.firstName === "string" ? input.firstName.trim() : "";
  const lastName = typeof input.lastName === "string" ? input.lastName.trim() : "";
  const mobile = typeof input.mobile === "string" ? normalizeMobile(input.mobile) : "";
  if (!firstName || firstName.length > 100 || !lastName || lastName.length > 100 || mobile.length < 7 || mobile.length > 32) return NextResponse.json({ error: "Invalid profile." }, { status: 400 });
  const { error } = await getSupabaseAdmin().from("client_profiles").update({ first_name: firstName, last_name: lastName, mobile }).eq("id", identity.profileId).eq("client_id", identity.clientId).eq("user_id", identity.user.id);
  if (error) return NextResponse.json({ error: "Unable to update profile." }, { status: 500 });
  await auditCustomerEvent({ action: "profile_updated", actorType: "customer", userId: identity.user.id, clientId: identity.clientId, profileId: identity.profileId, entityType: "client_profile", entityId: identity.profileId });
  return new NextResponse(null, { status: 204 });
}
