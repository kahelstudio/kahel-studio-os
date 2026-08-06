import { NextResponse } from "next/server";
import { hasStaffSession, signInStaff, staffAuthConfigured, STAFF_SESSION_COOKIE } from "@/lib/server/staff-auth";
import { turnstileConfigured, turnstileRequired, turnstileSiteKey, verifyTurnstile } from "@/lib/server/turnstile";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return NextResponse.json({
    authenticated: await hasStaffSession(request),
    configured: staffAuthConfigured(),
    turnstileRequired: turnstileRequired(),
    turnstileConfigured: turnstileConfigured(),
    turnstileSiteKey: turnstileSiteKey(),
    googleConfigured: process.env.GOOGLE_AUTH_ENABLED === "true",
  });
}

export async function POST(request: Request) {
  const { email, password, "cf-turnstile-response": turnstileToken } = await request.json() as { email?: unknown; password?: unknown; "cf-turnstile-response"?: unknown };
  if (typeof email !== "string" || typeof password !== "string") return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  if (!await verifyTurnstile(request, typeof turnstileToken === "string" ? turnstileToken : "")) {
    return NextResponse.json({ error: turnstileConfigured() ? "Security verification failed. Please try again." : "Security verification is not configured." }, { status: turnstileConfigured() ? 403 : 503 });
  }
  const session = await signInStaff(email, password);
  if (!session) return NextResponse.json({ error: staffAuthConfigured() ? "Invalid email or password." : "Staff authentication is not configured." }, { status: staffAuthConfigured() ? 401 : 503 });
  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(STAFF_SESSION_COOKIE, session.access_token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: session.expires_in, path: "/" });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(STAFF_SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 0, path: "/" });
  return response;
}
