import { NextResponse } from "next/server";
import { hasTrustedOrigin } from "@/lib/server/customer-auth";
import { getStaffPrincipal } from "@/lib/server/staff-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

const TERMINAL = new Set(["converted", "expired", "cancelled"]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const principal = await getStaffPrincipal(request);
  if (!principal || !["admin", "super_admin"].includes(principal.role)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => ({}) as Record<string, unknown>) as Record<string, unknown>;
  const newStatus = body.status === "expired" ? "expired" : "cancelled";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wa = getSupabaseAdmin() as any;
  const { data: entry } = await wa.from("waitlist_entries").select("status").eq("id", id).maybeSingle() as { data: { status: string } | null };
  if (!entry) return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  if (TERMINAL.has(entry.status)) return NextResponse.json({ error: "Entry is already in a terminal state." }, { status: 409 });
  const { error } = await wa.from("waitlist_entries").update({ status: newStatus }).eq("id", id);
  if (error) return NextResponse.json({ error: "Update failed." }, { status: 500 });
  return NextResponse.json({ ok: true, status: newStatus });
}
