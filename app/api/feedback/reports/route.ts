import { NextResponse } from "next/server";
import { getFeedbackReports } from "@/lib/server/feedback-data";
import { getStaffPrincipal } from "@/lib/server/staff-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export async function GET() {
  try {
    const reports = await getFeedbackReports();
    return NextResponse.json(reports);
  } catch {
    return NextResponse.json({ error: "Failed to fetch feedback reports" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const principal = await getStaffPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const summary = typeof body?.summary === "string" ? body.summary.trim() : "";
  const kind = body?.kind === "idea" ? "Idea" : body?.kind === "problem" ? "Problem" : "";
  const app = typeof body?.app === "string" ? body.app.trim().slice(0, 64) : "";
  if (summary.length < 10 || summary.length > 4000) return NextResponse.json({ error: "Describe the report in 10–4,000 characters." }, { status: 400 });
  if (!kind || !app) return NextResponse.json({ error: "Choose a report type and app." }, { status: 400 });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const iid = `FB-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
    const result = await getSupabaseAdmin().from("feedback_reports").insert({ iid, title: summary.slice(0, 120), summary, app, kind, status: "Submitted", priority: "Normal", submitted_by: principal.userId }).select("id,iid").single();
    if (!result.error && result.data) return NextResponse.json(result.data, { status: 201 });
    if (result.error?.code !== "23505") return NextResponse.json({ error: "Unable to send the report." }, { status: 500 });
  }
  return NextResponse.json({ error: "Unable to allocate a report reference." }, { status: 500 });
}
