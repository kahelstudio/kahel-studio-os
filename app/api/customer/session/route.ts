import { NextResponse } from "next/server";
import {
  auditCustomerEvent,
  clearCustomerSessionCookies,
  consumeCustomerRateLimit,
  getCustomerIdentityFromRequest,
  hasTrustedOrigin,
  isStaffAddress,
  isValidEmail,
  normalizeEmail,
  refreshCustomerSession,
  setCustomerSessionCookies,
  CUSTOMER_ACCESS_COOKIE,
} from "@/lib/server/customer-auth";
import { getSupabaseAdmin, getSupabaseAuthClient } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

type SignInRequest = { email?: unknown; password?: unknown };

export async function GET(request: Request) {
  let identity = await getCustomerIdentityFromRequest(request);
  let refreshed = null;
  if (!identity) {
    refreshed = await refreshCustomerSession(request);
    if (refreshed) {
      const nextHeaders = new Headers(request.headers);
      nextHeaders.set("cookie", `${CUSTOMER_ACCESS_COOKIE}=${encodeURIComponent(refreshed.access_token)}`);
      identity = await getCustomerIdentityFromRequest(new Request(request.url, { headers: nextHeaders }));
    }
  }
  const response = NextResponse.json(identity ? { authenticated: true, firstName: identity.firstName } : { authenticated: false }, { headers: { "Cache-Control": "no-store" } });
  if (refreshed && identity) setCustomerSessionCookies(response, refreshed);
  return response;
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Email or password is incorrect." }, { status: 403 });
  let input: SignInRequest;
  try { input = await request.json() as SignInRequest; } catch { return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 }); }
  const email = typeof input.email === "string" ? normalizeEmail(input.email) : "";
  const password = typeof input.password === "string" ? input.password : "";
  if (!isValidEmail(email) || !password || password.length > 256 || isStaffAddress(email)) return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  try {
    if (!await consumeCustomerRateLimit(request, "customer_signin", email, 8)) return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    const { data, error } = await getSupabaseAuthClient().auth.signInWithPassword({ email, password });
    if (error || !data.session || !data.user.email_confirmed_at) {
      await auditCustomerEvent({ action: "sign_in_failed", metadata: { reason: "invalid_credentials" } });
      return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    }
    const { data: profile } = await getSupabaseAdmin().from("client_profiles").select("id,client_id,status").eq("user_id", data.user.id).maybeSingle<{ id: string; client_id: string; status: string }>();
    if (!profile || profile.status !== "active") {
      await getSupabaseAuthClient(data.session.access_token).auth.signOut();
      await auditCustomerEvent({ action: "portal_access_denied", userId: data.user.id, metadata: { reason: "missing_or_disabled_profile" } });
      return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    }
    const response = NextResponse.json({ authenticated: true }, { headers: { "Cache-Control": "no-store" } });
    setCustomerSessionCookies(response, data.session);
    await auditCustomerEvent({ action: "sign_in_succeeded", actorType: "customer", userId: data.user.id, clientId: profile.client_id, profileId: profile.id, entityId: profile.id });
    return response;
  } catch {
    return NextResponse.json({ error: "Unable to sign in right now." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Unable to sign out." }, { status: 403 });
  const identity = await getCustomerIdentityFromRequest(request);
  const accessToken = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${CUSTOMER_ACCESS_COOKIE}=`))?.slice(CUSTOMER_ACCESS_COOKIE.length + 1);
  if (accessToken) await getSupabaseAuthClient(decodeURIComponent(accessToken)).auth.signOut();
  if (identity) await auditCustomerEvent({ action: "customer_signed_out", actorType: "customer", userId: identity.user.id, clientId: identity.clientId, profileId: identity.profileId, entityId: identity.profileId });
  const response = new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  clearCustomerSessionCookies(response);
  return response;
}
