import { NextResponse } from "next/server";
import { getStaffPrincipal } from "@/lib/server/staff-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { sendRecoveryEmailCode } from "@/lib/server/security-email";

export const runtime = "nodejs";

const validEmail = (value: string) => value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const hashCode = async (userId: string, code: string) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${userId}:${code}`)))].map((byte) => byte.toString(16).padStart(2, "0")).join("");

async function userFor(request: Request) {
  const principal = await getStaffPrincipal(request);
  if (!principal?.userId) return null;
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.admin.getUserById(principal.userId);
  return !error && data.user ? { principal, user: data.user, admin } : null;
}

export async function GET(request: Request) {
  const current = await userFor(request);
  if (!current) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const recoveryEmail = typeof current.user.user_metadata?.recovery_email === "string" ? current.user.user_metadata.recovery_email : null;
  return NextResponse.json({ recoveryEmail });
}

export async function POST(request: Request) {
  const current = await userFor(request);
  if (!current) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json() as { email?: unknown };
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!validEmail(email) || email === current.user.email?.toLowerCase()) return NextResponse.json({ error: "Enter a different valid recovery email." }, { status: 400 });
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
  const metadata = { ...current.user.user_metadata, pending_recovery_email: email, recovery_email_code_hash: await hashCode(current.principal.userId!, code), recovery_email_code_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() };
  const updated = await current.admin.auth.admin.updateUserById(current.principal.userId!, { user_metadata: metadata });
  if (updated.error) return NextResponse.json({ error: "Unable to start recovery email verification." }, { status: 500 });
  if (!await sendRecoveryEmailCode(email, code)) {
    await current.admin.auth.admin.updateUserById(current.principal.userId!, { user_metadata: { ...metadata, pending_recovery_email: null, recovery_email_code_hash: null, recovery_email_code_expires_at: null } });
    return NextResponse.json({ error: "Unable to send the verification email." }, { status: 503 });
  }
  return NextResponse.json({ verificationRequired: true });
}

export async function PUT(request: Request) {
  const current = await userFor(request);
  if (!current) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json() as { code?: unknown };
  const code = typeof body.code === "string" ? body.code : "";
  const metadata = current.user.user_metadata ?? {};
  const pendingEmail = typeof metadata.pending_recovery_email === "string" ? metadata.pending_recovery_email : "";
  const expectedHash = typeof metadata.recovery_email_code_hash === "string" ? metadata.recovery_email_code_hash : "";
  const expiresAt = typeof metadata.recovery_email_code_expires_at === "string" ? Date.parse(metadata.recovery_email_code_expires_at) : 0;
  if (!/^\d{6}$/.test(code) || !pendingEmail || expiresAt < Date.now() || await hashCode(current.principal.userId!, code) !== expectedHash) return NextResponse.json({ error: "The verification code is invalid or expired." }, { status: 400 });
  const result = await current.admin.auth.admin.updateUserById(current.principal.userId!, { user_metadata: { ...metadata, recovery_email: pendingEmail, pending_recovery_email: null, recovery_email_code_hash: null, recovery_email_code_expires_at: null } });
  return result.error ? NextResponse.json({ error: "Unable to verify the recovery email." }, { status: 500 }) : NextResponse.json({ recoveryEmail: pendingEmail });
}

export async function DELETE(request: Request) {
  const current = await userFor(request);
  if (!current) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const metadata = current.user.user_metadata ?? {};
  const result = await current.admin.auth.admin.updateUserById(current.principal.userId!, { user_metadata: { ...metadata, recovery_email: null, pending_recovery_email: null, recovery_email_code_hash: null, recovery_email_code_expires_at: null } });
  return result.error ? NextResponse.json({ error: "Unable to remove the recovery email." }, { status: 500 }) : NextResponse.json({ recoveryEmail: null });
}
