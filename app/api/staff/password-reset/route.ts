import { NextResponse } from "next/server";
import { getStaffPrincipal, requestPasswordReset, updateStaffPassword, updateStaffPasswordWithRecoveryToken } from "@/lib/server/staff-auth";
import { validatePassword } from "@/lib/server/password-policy";
import { turnstileConfigured, turnstileRequired, verifyTurnstile } from "@/lib/server/turnstile";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { email?: unknown; accessToken?: unknown; tokenHash?: unknown; password?: unknown; "cf-turnstile-response"?: unknown };
  try { body = await request.json() as typeof body; } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (typeof body.accessToken === "string" || typeof body.tokenHash === "string" || typeof body.password === "string") {
    const password = typeof body.password === "string" ? body.password : "";
    const passwordError = await validatePassword(password);
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });
    const principal = typeof body.accessToken === "string" || typeof body.tokenHash === "string" ? null : await getStaffPrincipal(request);
    const accessToken = typeof body.accessToken === "string" ? body.accessToken : principal?.accessToken;
    if (typeof body.tokenHash !== "string" && !accessToken) return NextResponse.json({ error: "Sign in again before changing your password." }, { status: 401 });
    const updated = typeof body.tokenHash === "string"
      ? await updateStaffPasswordWithRecoveryToken(body.tokenHash, password)
      : await updateStaffPassword(accessToken!, password);
    return updated
      ? NextResponse.json({ updated: true })
      : NextResponse.json({ error: "This password reset link is invalid or has expired." }, { status: 400 });
  }

  if (typeof body.email !== "string") return NextResponse.json({ error: "Enter your email address." }, { status: 400 });
  if (!await verifyTurnstile(request, typeof body["cf-turnstile-response"] === "string" ? body["cf-turnstile-response"] : "")) {
    return NextResponse.json({ error: turnstileConfigured() ? "Security verification failed. Please try again." : "Security verification is not configured." }, { status: turnstileRequired() ? 403 : 503 });
  }
  await requestPasswordReset(body.email);
  return NextResponse.json({ requested: true });
}
