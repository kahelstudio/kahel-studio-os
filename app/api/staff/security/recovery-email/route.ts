import { NextResponse } from "next/server";
import { getStaffPrincipal } from "@/lib/server/staff-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { sendRecoveryEmailCode } from "@/lib/server/security-email";

export const runtime = "nodejs";

const validEmail = (value: string) => value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const hashCode = async (userId: string, code: string) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${userId}:${code}`)))].map((byte) => byte.toString(16).padStart(2, "0")).join("");

async function currentStaff(request: Request) {
  const principal = await getStaffPrincipal(request);
  if (!principal?.userId) return null;
  return { principal, admin: getSupabaseAdmin() };
}

export async function GET(request: Request) {
  const current = await currentStaff(request);
  if (!current) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const result = await current.admin.from("staff_recovery_emails").select("recovery_email").eq("staff_id", current.principal.userId!).maybeSingle<{ recovery_email: string | null }>();
  if (result.error) return NextResponse.json({ error: "Unable to load the recovery email." }, { status: 500 });
  return NextResponse.json({ recoveryEmail: result.data?.recovery_email ?? null });
}

export async function POST(request: Request) {
  const current = await currentStaff(request);
  if (!current) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  let body: { email?: unknown };
  try { body = await request.json() as typeof body; } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!validEmail(email) || email === current.principal.email.toLowerCase()) return NextResponse.json({ error: "Enter a different valid recovery email." }, { status: 400 });

  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
  const pending = await current.admin.from("staff_recovery_emails").upsert({
    staff_id: current.principal.userId!,
    pending_email: email,
    verification_code_hash: await hashCode(current.principal.userId!, code),
    verification_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (pending.error) return NextResponse.json({ error: pending.error.code === "23505" ? "That recovery email is already in use." : "Unable to start recovery email verification." }, { status: pending.error.code === "23505" ? 409 : 500 });
  if (!await sendRecoveryEmailCode(email, code, crypto.randomUUID(), current.principal.userId ?? undefined)) {
    await current.admin.from("staff_recovery_emails").update({ pending_email: null, verification_code_hash: null, verification_expires_at: null, updated_at: new Date().toISOString() }).eq("staff_id", current.principal.userId!);
    return NextResponse.json({ error: "Unable to send the verification email." }, { status: 503 });
  }
  return NextResponse.json({ verificationRequired: true });
}

export async function PUT(request: Request) {
  const current = await currentStaff(request);
  if (!current) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  let body: { code?: unknown };
  try { body = await request.json() as typeof body; } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const code = typeof body.code === "string" ? body.code : "";
  const result = await current.admin.from("staff_recovery_emails").select("pending_email,verification_code_hash,verification_expires_at").eq("staff_id", current.principal.userId!).maybeSingle<{ pending_email: string | null; verification_code_hash: string | null; verification_expires_at: string | null }>();
  const row = result.data;
  const valid = /^\d{6}$/.test(code) && row?.pending_email && row.verification_code_hash && row.verification_expires_at && Date.parse(row.verification_expires_at) >= Date.now() && await hashCode(current.principal.userId!, code) === row.verification_code_hash;
  if (!valid) return NextResponse.json({ error: "The verification code is invalid or expired." }, { status: 400 });
  const updated = await current.admin.from("staff_recovery_emails").update({ recovery_email: row.pending_email, pending_email: null, verification_code_hash: null, verification_expires_at: null, updated_at: new Date().toISOString() }).eq("staff_id", current.principal.userId!);
  return updated.error ? NextResponse.json({ error: "Unable to verify the recovery email." }, { status: 500 }) : NextResponse.json({ recoveryEmail: row.pending_email });
}

export async function DELETE(request: Request) {
  const current = await currentStaff(request);
  if (!current) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const result = await current.admin.from("staff_recovery_emails").delete().eq("staff_id", current.principal.userId!);
  return result.error ? NextResponse.json({ error: "Unable to remove the recovery email." }, { status: 500 }) : NextResponse.json({ recoveryEmail: null });
}
