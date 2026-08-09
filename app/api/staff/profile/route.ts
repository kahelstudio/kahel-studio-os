import { NextResponse } from "next/server";
import { getStaffPrincipal } from "@/lib/server/staff-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { getMyProfile } from "@/lib/server/profile-data";

export const runtime = "nodejs";

export async function GET() {
  const profile = await getMyProfile();
  if (!profile) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  return NextResponse.json({ displayName: profile.displayName, initials: profile.initials, avatarUrl: profile.avatarUrl, role: profile.adminRole });
}

export async function PATCH(request: Request) {
  const principal = await getStaffPrincipal(request);
  if (!principal?.userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  let body: { displayName?: unknown };
  try { body = await request.json() as typeof body; } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const displayName = typeof body.displayName === "string" ? body.displayName.trim().replace(/\s+/g, " ") : "";
  if (displayName.length < 2 || displayName.length > 100) {
    return NextResponse.json({ error: "Display name must be between 2 and 100 characters." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("staff_profiles").update({ display_name: displayName }).eq("user_id", principal.userId);
  if (error) return NextResponse.json({ error: "Unable to update your profile." }, { status: 500 });

  return NextResponse.json({ displayName });
}
