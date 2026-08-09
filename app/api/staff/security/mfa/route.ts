import { NextResponse } from "next/server";
import { getSupabaseAuthClient } from "@/lib/server/supabase-admin";
import { IS_PRODUCTION, staffEmailAuthorized, STAFF_REFRESH_COOKIE, STAFF_SESSION_COOKIE } from "@/lib/server/staff-auth";

export const runtime = "nodejs";

function accessToken(request: Request) {
  const encoded = request.headers.get("cookie")?.match(new RegExp(`(?:^|; )${STAFF_SESSION_COOKIE}=([^;]+)`))?.[1];
  return encoded ? decodeURIComponent(encoded) : null;
}

async function authenticatedClient(request: Request) {
  const token = accessToken(request);
  if (!token) return null;
  const client = getSupabaseAuthClient(token);
  const { data, error } = await client.auth.getUser();
  return !error && staffEmailAuthorized(data.user?.email) ? client : null;
}

export async function GET(request: Request) {
  const client = await authenticatedClient(request);
  if (!client) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { data, error } = await client.auth.mfa.listFactors();
  if (error) return NextResponse.json({ error: "Unable to load two-factor authentication." }, { status: 500 });
  const verified = data.totp.find((factor) => factor.status === "verified");
  return NextResponse.json({ enabled: Boolean(verified), factorId: verified?.id ?? null });
}

export async function POST(request: Request) {
  const client = await authenticatedClient(request);
  if (!client) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const factors = await client.auth.mfa.listFactors();
  if (factors.error) return NextResponse.json({ error: "Unable to start two-factor setup." }, { status: 500 });
  for (const factor of factors.data.all.filter((item) => item.factor_type === "totp" && item.status === "unverified")) await client.auth.mfa.unenroll({ factorId: factor.id });
  if (factors.data.totp.some((factor) => factor.status === "verified")) return NextResponse.json({ error: "Two-factor authentication is already enabled." }, { status: 409 });
  const { data, error } = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: "Kahel Studio OS" });
  if (error) return NextResponse.json({ error: "Unable to start two-factor setup." }, { status: 500 });
  return NextResponse.json({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
}

export async function PUT(request: Request) {
  const client = await authenticatedClient(request);
  if (!client) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json() as { factorId?: unknown; code?: unknown };
  if (typeof body.code !== "string" || !/^\d{6}$/.test(body.code)) return NextResponse.json({ error: "Enter the 6-digit authentication code." }, { status: 400 });
  let factorId = typeof body.factorId === "string" ? body.factorId : "";
  if (!factorId) {
    const factors = await client.auth.mfa.listFactors();
    factorId = factors.data?.totp.find((factor) => factor.status === "verified")?.id ?? "";
  }
  if (!factorId) return NextResponse.json({ error: "No authenticator is available." }, { status: 400 });
  const { data, error } = await client.auth.mfa.challengeAndVerify({ factorId, code: body.code });
  if (error) return NextResponse.json({ error: "The authentication code is invalid or expired." }, { status: 400 });
  const response = NextResponse.json({ verified: true });
  const secure = { httpOnly: true, sameSite: "lax" as const, secure: IS_PRODUCTION, path: "/" };
  response.cookies.set(STAFF_SESSION_COOKIE, data.access_token, { ...secure, maxAge: data.expires_in });
  response.cookies.set(STAFF_REFRESH_COOKIE, data.refresh_token, { ...secure, maxAge: 60 * 60 * 24 * 30 });
  return response;
}

export async function DELETE(request: Request) {
  const client = await authenticatedClient(request);
  if (!client) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json() as { factorId?: unknown };
  if (typeof body.factorId !== "string") return NextResponse.json({ error: "Authenticator not found." }, { status: 400 });
  const { error } = await client.auth.mfa.unenroll({ factorId: body.factorId });
  return error ? NextResponse.json({ error: "Verify with your authenticator before disabling two-factor authentication." }, { status: 400 }) : NextResponse.json({ enabled: false });
}
