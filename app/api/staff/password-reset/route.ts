import { NextResponse } from "next/server";
import { requestPasswordReset, updateStaffPassword } from "@/lib/server/staff-auth";
import { turnstileConfigured, turnstileRequired, verifyTurnstile } from "@/lib/server/turnstile";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json() as { email?: unknown; accessToken?: unknown; password?: unknown; "cf-turnstile-response"?: unknown };
  if (typeof body.accessToken === "string" || typeof body.password === "string") {
    if (typeof body.accessToken !== "string" || typeof body.password !== "string" || body.password.length < 12 || body.password.length > 128 || !/[A-Z]/.test(body.password) || !/[a-z]/.test(body.password) || !/[0-9]/.test(body.password) || !/[^A-Za-z0-9]/.test(body.password)) {
      return NextResponse.json({ error: "Password must be 12–128 characters with an uppercase letter, a lowercase letter, a digit, and a symbol." }, { status: 400 });
    }
    return await updateStaffPassword(body.accessToken, body.password)
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
