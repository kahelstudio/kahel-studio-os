import { NextResponse } from "next/server";
import { getStaffPrincipal } from "@/lib/server/staff-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

const severities = new Set(["High", "Medium", "Low"]);

function glitchReference() {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "2-digit", month: "2-digit", day: "2-digit" }).format(new Date()).replaceAll("-", "");
  const random = [...crypto.getRandomValues(new Uint8Array(3))].map((byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `GL-${date}-${random}`;
}

export async function POST(request: Request) {
  const principal = await getStaffPrincipal(request);
  if (!principal?.userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json() as { title?: unknown; area?: unknown; severity?: unknown };
  const title = typeof body.title === "string" ? body.title.trim().replace(/\s+/g, " ") : "";
  const area = typeof body.area === "string" ? body.area.trim().replace(/\s+/g, " ") : "";
  const severity = typeof body.severity === "string" ? body.severity : "";
  if (title.length < 5 || title.length > 500) return NextResponse.json({ error: "Describe the issue in 5–500 characters." }, { status: 400 });
  if (area.length < 2 || area.length > 255) return NextResponse.json({ error: "Enter the affected app or area." }, { status: 400 });
  if (!severities.has(severity)) return NextResponse.json({ error: "Choose a valid severity." }, { status: 400 });

  const admin = getSupabaseAdmin();
  const profile = await admin.from("staff_profiles").select("display_name").eq("user_id", principal.userId).maybeSingle();
  const reporter = profile.data?.display_name ?? principal.email;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const reference = glitchReference();
    const { data, error } = await admin.from("glitches").insert({ reference, title, area, severity, reporter, status: "open", created_by: principal.userId }).select("id,reference").single();
    if (!error && data) return NextResponse.json(data, { status: 201 });
    if (error?.code !== "23505") return NextResponse.json({ error: "Unable to report the glitch." }, { status: 500 });
  }
  return NextResponse.json({ error: "Unable to generate a glitch reference." }, { status: 500 });
}
