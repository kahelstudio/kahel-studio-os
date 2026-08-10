import { NextResponse } from "next/server";
import { hasTrustedOrigin } from "@/lib/server/customer-auth";
import { getStaffPrincipal } from "@/lib/server/staff-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { getGlitchesWorkspace } from "@/lib/server/glitches-data";
import { notifyGlitch } from "@/lib/server/glitch-notifications";
import { cleanGlitchText, isGlitchCategory, isGlitchSeverity, validGlitchTimestamp } from "@/lib/glitches";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const principal = await getStaffPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try {
    return NextResponse.json(await getGlitchesWorkspace(principal));
  } catch (error) {
    console.error("Unable to load glitches", error);
    return NextResponse.json({ error: "Unable to load glitches." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const principal = await getStaffPrincipal(request);
  if (!principal?.userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await readBody(request);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const title = cleanGlitchText(body.title, 200);
  const description = cleanGlitchText(body.description, 5000);
  const location = cleanGlitchText(body.locationOrSystem, 255) || null;
  const workaround = cleanGlitchText(body.workaround, 2000) || null;
  if (title.length < 3) return NextResponse.json({ error: "Issue title must be at least 3 characters." }, { status: 400 });
  if (description.length < 5) return NextResponse.json({ error: "Description must be at least 5 characters." }, { status: 400 });
  if (!isGlitchCategory(body.category)) return NextResponse.json({ error: "Choose a valid category." }, { status: 400 });
  if (!isGlitchSeverity(body.severity)) return NextResponse.json({ error: "Choose a valid severity." }, { status: 400 });
  if (!validGlitchTimestamp(body.observedAt)) return NextResponse.json({ error: "Enter a valid observed date and time." }, { status: 400 });
  const assignedTo = optionalUuid(body.assignedTo), bookingId = optionalUuid(body.bookingId), projectId = optionalUuid(body.projectId), clientId = optionalUuid(body.clientId);
  if ([body.assignedTo, body.bookingId, body.projectId, body.clientId].some((value, index) => value && ![assignedTo, bookingId, projectId, clientId][index])) return NextResponse.json({ error: "A related record is invalid." }, { status: 400 });

  const admin = getSupabaseAdmin();
  const profile = await admin.from("staff_profiles").select("display_name").eq("user_id", principal.userId).maybeSingle();
  const created = await admin.from("glitches").insert({
    title, description, category: body.category, severity: body.severity, status: "Open", location_or_system: location,
    operations_blocked: body.operationsBlocked === true, workaround, reported_by: principal.userId, reporter_name: profile.data?.display_name ?? principal.email,
    assigned_to: assignedTo, booking_id: bookingId, project_id: projectId, client_id: clientId, observed_at: new Date(String(body.observedAt)).toISOString(),
  }).select("id,reference").single();
  if (created.error || !created.data) {
    console.error("Unable to create glitch", created.error);
    return NextResponse.json({ error: "Unable to report the glitch." }, { status: 500 });
  }
  const activity = await admin.from("glitch_activity").insert({ glitch_id: created.data.id, actor_id: principal.userId, event_type: "created", message: `Reported ${created.data.reference}.`, metadata: { severity: body.severity, category: body.category } });
  if (activity.error) {
    await admin.from("glitches").delete().eq("id", created.data.id);
    return NextResponse.json({ error: "Unable to record the glitch activity." }, { status: 500 });
  }
  const notices: Parameters<typeof notifyGlitch>[0] = [];
  if (assignedTo && assignedTo !== principal.userId) notices.push({ recipientId: assignedTo, glitchId: created.data.id, reference: created.data.reference, kind: "assigned", title: `${created.data.reference} assigned to you`, body: title });
  if (body.severity === "Critical") {
    const admins = await admin.from("staff_profiles").select("user_id").in("role", ["admin", "super_admin"]).eq("active", true);
    for (const item of admins.data ?? []) if (item.user_id !== principal.userId) notices.push({ recipientId: item.user_id, glitchId: created.data.id, reference: created.data.reference, kind: "critical", title: `Critical glitch ${created.data.reference}`, body: title });
  }
  await notifyGlitch(notices);
  return NextResponse.json(created.data, { status: 201 });
}

async function readBody(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 32_768) return null;
  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : null;
  } catch { return null; }
}

function optionalUuid(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null;
}
