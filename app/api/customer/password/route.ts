import { NextResponse } from "next/server";
import { auditCustomerEvent, getCustomerIdentityFromRequest, hasTrustedOrigin, CUSTOMER_ACCESS_COOKIE } from "@/lib/server/customer-auth";
import { getSupabaseAuthClient } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

function validPassword(password: string) {
  return password.length >= 12 && password.length <= 128 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "This password link is invalid or has expired." }, { status: 403 });
  const identity = await getCustomerIdentityFromRequest(request);
  if (!identity) return NextResponse.json({ error: "This password link is invalid or has expired." }, { status: 401 });
  let password = "";
  try { const input = await request.json() as { password?: unknown }; password = typeof input.password === "string" ? input.password : ""; } catch {}
  if (!validPassword(password)) return NextResponse.json({ error: "Password does not meet the security requirements." }, { status: 400 });
  const accessToken = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${CUSTOMER_ACCESS_COOKIE}=`))?.slice(CUSTOMER_ACCESS_COOKIE.length + 1);
  if (!accessToken) return NextResponse.json({ error: "This password link is invalid or has expired." }, { status: 401 });
  const { error } = await getSupabaseAuthClient(decodeURIComponent(accessToken)).auth.updateUser({ password });
  if (error) return NextResponse.json({ error: "Unable to update your password right now." }, { status: 400 });
  await auditCustomerEvent({ action: "password_changed", actorType: "customer", userId: identity.user.id, clientId: identity.clientId, profileId: identity.profileId, entityId: identity.profileId });
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
