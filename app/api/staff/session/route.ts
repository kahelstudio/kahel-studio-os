import { NextResponse } from "next/server";
import { hasStaffSession, signInStaff, staffAuthConfigured, STAFF_SESSION_COOKIE, STAFF_REFRESH_COOKIE, REMEMBER_ME_MAX_AGE, IS_PRODUCTION } from "@/lib/server/staff-auth";
import { turnstileConfigured, turnstileRequired, turnstileSiteKey, verifyTurnstile } from "@/lib/server/turnstile";

export const runtime = "nodejs";
const MFA_REMEMBER_COOKIE = "kahel_staff_mfa_remember";

export async function GET(request: Request) {
  return NextResponse.json({
    authenticated: await hasStaffSession(request),
    configured: staffAuthConfigured(),
    turnstileRequired: turnstileRequired(),
    turnstileConfigured: turnstileConfigured(),
    turnstileSiteKey: turnstileSiteKey(),
    googleConfigured: process.env.GOOGLE_AUTH_ENABLED === "true",
    configurationChecks: {
      staffEmails: Boolean(process.env.KAHEL_STAFF_EMAILS || process.env.KAHEL_STAFF_EMAIL),
      supabaseUrl: Boolean(process.env.SUPABASE_URL),
      supabasePublishableKey: Boolean(process.env.SUPABASE_PUBLISHABLE_KEY),
      supabaseSecretKey: Boolean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
      authRedirectUrl: Boolean(process.env.AUTH_REDIRECT_URL),
      turnstileSecret: Boolean(process.env.TURNSTILE_SECRET),
      paymongoWebhookSecret: Boolean(process.env.PAYMONGO_WEBHOOK_SECRET),
    },
  });
}

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown; rememberMe?: unknown; "cf-turnstile-response"?: unknown };
  try { body = await request.json() as typeof body; } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const { email, password, rememberMe, "cf-turnstile-response": turnstileToken } = body;
  if (typeof email !== "string" || typeof password !== "string") return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  if (!await verifyTurnstile(request, typeof turnstileToken === "string" ? turnstileToken : "")) {
    return NextResponse.json({ error: turnstileConfigured() ? "Security verification failed. Please try again." : "Security verification is not configured." }, { status: turnstileConfigured() ? 403 : 503 });
  }
  const session = await signInStaff(email, password);
  if (!session) return NextResponse.json({ error: staffAuthConfigured() ? "Invalid email or password." : "Staff authentication is not configured." }, { status: staffAuthConfigured() ? 401 : 503 });
  const mfaRequired = session.user.factors?.some((factor) => factor.factor_type === "totp" && factor.status === "verified") ?? false;
  const response = NextResponse.json({ authenticated: !mfaRequired, mfaRequired });
  const maxAge = rememberMe === true ? REMEMBER_ME_MAX_AGE : session.expires_in;
  const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: IS_PRODUCTION, maxAge, path: "/" };
  response.cookies.set(STAFF_SESSION_COOKIE, session.access_token, cookieOptions);
  if (mfaRequired) {
    response.cookies.set(MFA_REMEMBER_COOKIE, rememberMe === true ? "1" : "0", { ...cookieOptions, maxAge: 10 * 60 });
  }
  if (session.refresh_token) {
    response.cookies.set(STAFF_REFRESH_COOKIE, session.refresh_token, { ...cookieOptions, maxAge: REMEMBER_ME_MAX_AGE });
  }
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(STAFF_SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: IS_PRODUCTION, maxAge: 0, path: "/" });
  response.cookies.set(STAFF_REFRESH_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: IS_PRODUCTION, maxAge: 0, path: "/" });
  response.cookies.set(MFA_REMEMBER_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: IS_PRODUCTION, maxAge: 0, path: "/" });
  return response;
}
