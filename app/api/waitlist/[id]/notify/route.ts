import { NextResponse } from "next/server";
import { hasTrustedOrigin } from "@/lib/server/customer-auth";
import { getStaffPrincipal } from "@/lib/server/staff-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { sendWaitlistSlotAvailable } from "@/lib/server/waitlist-email";

export const runtime = "nodejs";

type EntryRow = { id: string; name: string; email: string; status: string; services: { name: string } | null };

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const principal = await getStaffPrincipal(request);
  if (!principal || !["admin", "super_admin"].includes(principal.role)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }
  const { id } = await params;
  const admin = getSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wa = admin as any;
  const { data: entry } = await wa
    .from("waitlist_entries")
    .select("id, name, email, status, services(name)")
    .eq("id", id)
    .maybeSingle() as { data: EntryRow | null };
  if (!entry) return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  if (entry.status !== "waiting") return NextResponse.json({ error: "Only waiting entries can be notified." }, { status: 409 });
  const { error } = await wa
    .from("waitlist_entries")
    .update({ status: "notified", notified_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return NextResponse.json({ error: "Update failed." }, { status: 500 });
  const firstName = entry.name.split(/\s+/)[0];
  void sendWaitlistSlotAvailable({ to: entry.email, firstName, serviceName: entry.services?.name ?? "your session", waitlistId: id });
  return NextResponse.json({ ok: true });
}
