import { NextResponse } from "next/server";
import { hasTrustedOrigin } from "@/lib/server/customer-auth";
import { cleanGlitchText, isGlitchCategory, isGlitchSeverity, isGlitchStatus, type GlitchStatus, validGlitchTimestamp } from "@/lib/glitches";
import { getStaffPrincipal, type StaffPrincipal } from "@/lib/server/staff-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { notifyGlitch } from "@/lib/server/glitch-notifications";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
type Existing = { id: string; reference: string; title: string; status: GlitchStatus; reported_by: string | null; assigned_to: string | null; resolution_summary: string | null; resolved_at: string | null; resolved_by: string | null };
type GlitchUpdate = { assigned_to?: string | null; title?: string; description?: string; location_or_system?: string | null; workaround?: string | null; operations_blocked?: boolean; category?: string; severity?: string; status?: string; resolution_summary?: string; resolved_at?: string; resolved_by?: string; closed_at?: string | null; linked_task_id?: string; archived_at?: string };

export async function PATCH(request: Request, context: Context) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const principal = await getStaffPrincipal(request);
  if (!principal?.userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const { id } = await context.params;
  if (!body || !isUuid(id)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const admin = getSupabaseAdmin();
  const found = await admin.from("glitches").select("id,reference,title,status,reported_by,assigned_to,resolution_summary,resolved_at,resolved_by").eq("id", id).is("archived_at", null).maybeSingle<Existing>();
  if (found.error) return NextResponse.json({ error: "Unable to load the glitch." }, { status: 500 });
  if (!found.data) return NextResponse.json({ error: "Glitch not found." }, { status: 404 });
  const glitch = found.data;
  const adminRole = principal.role !== "staff";
  const participant = adminRole || glitch.reported_by === principal.userId || glitch.assigned_to === principal.userId;
  if (!participant) return NextResponse.json({ error: "You do not have access to this glitch." }, { status: 403 });
  const action = typeof body.action === "string" ? body.action : "";
  const result = await performAction({ ...principal, userId: principal.userId }, glitch, action, body, adminRole);
  if (result instanceof NextResponse) return result;
  return NextResponse.json(result);
}

async function performAction(principal: StaffPrincipal & { userId: string }, glitch: Existing, action: string, body: Record<string, unknown>, adminRole: boolean) {
  const admin = getSupabaseAdmin();
  let update: GlitchUpdate = {};
  let eventType = "updated";
  let message = "Glitch updated.";

  if (action === "internal_update") {
    const note = cleanGlitchText(body.message, 2000);
    if (note.length < 2) return error("Enter an internal update.");
    const inserted = await admin.from("glitch_activity").insert({ glitch_id: glitch.id, actor_id: principal.userId, event_type: "internal_update", message: note });
    return inserted.error ? serverError("Unable to add the update.", inserted.error) : { updated: true };
  }
  if (action === "assign") {
    if (!adminRole) return forbidden();
    const assignedTo = optionalUuid(body.assignedTo);
    if (body.assignedTo && !assignedTo) return error("Choose a valid assignee.");
    update = { assigned_to: assignedTo }; eventType = "assigned"; message = assignedTo ? "Glitch assigned." : "Glitch unassigned.";
  } else if (action === "edit") {
    if (!adminRole && glitch.assigned_to !== principal.userId) return forbidden();
    const title = cleanGlitchText(body.title, 200), description = cleanGlitchText(body.description, 5000);
    if (title.length < 3 || description.length < 5) return error("Complete the issue title and description.");
    update = { title, description, location_or_system: cleanGlitchText(body.locationOrSystem, 255) || null, workaround: cleanGlitchText(body.workaround, 2000) || null, operations_blocked: body.operationsBlocked === true };
    if (adminRole) {
      if (!isGlitchCategory(body.category) || !isGlitchSeverity(body.severity)) return error("Choose a valid category and severity.");
      update.category = body.category; update.severity = body.severity;
    }
  } else if (action === "status") {
    if (!isGlitchStatus(body.status)) return error("Choose a valid status.");
    if (["Resolved", "Closed"].includes(body.status)) return error("Use the resolve or close action.");
    if (!adminRole && glitch.assigned_to !== principal.userId) return forbidden();
    update = { status: body.status }; eventType = "status_changed"; message = `Status changed from ${glitch.status} to ${body.status}.`;
  } else if (action === "resolve") {
    if (!adminRole) return forbidden();
    const summary = cleanGlitchText(body.resolutionSummary, 5000);
    if (summary.length < 3 || !validGlitchTimestamp(body.resolvedAt)) return error("Add a resolution summary and valid resolution date.");
    update = { status: "Resolved", resolution_summary: summary, resolved_at: new Date(String(body.resolvedAt)).toISOString(), resolved_by: principal.userId, closed_at: null };
    eventType = "resolved"; message = `Resolved: ${summary}`;
  } else if (action === "reopen") {
    if (!adminRole) return forbidden();
    const reason = cleanGlitchText(body.reason, 1000);
    if (reason.length < 3) return error("Add a reason for reopening.");
    update = { status: "Open", closed_at: null }; eventType = "reopened"; message = `Reopened: ${reason}`;
  } else if (action === "close") {
    if (!adminRole || glitch.status !== "Resolved") return forbidden();
    update = { status: "Closed", closed_at: new Date().toISOString() }; eventType = "closed"; message = "Glitch closed.";
  } else if (action === "link_task") {
    if (!adminRole) return forbidden();
    const taskId = optionalUuid(body.taskId);
    if (!taskId) return error("Choose a valid task.");
    update = { linked_task_id: taskId }; eventType = "task_linked"; message = "Follow-up task linked.";
  } else if (action === "create_task") {
    if (!adminRole) return forbidden();
    const task = await admin.from("tasks").insert({ title: `Follow up ${glitch.reference}: ${glitch.title}`, description: cleanGlitchText(body.description, 1000) || null, column_status: "todo", priority: "High", category: "Glitch follow-up", linked_ref: glitch.reference, created_by: principal.userId }).select("id").single();
    if (task.error || !task.data) return serverError("Unable to create the follow-up task.", task.error);
    update = { linked_task_id: task.data.id }; eventType = "task_linked"; message = "Follow-up task created and linked.";
  } else if (action === "archive") {
    if (principal.role !== "super_admin") return forbidden();
    update = { archived_at: new Date().toISOString() }; eventType = "archived"; message = "Glitch archived.";
  } else return error("Unsupported action.");

  const changed = await admin.from("glitches").update(update).eq("id", glitch.id).select("id").single();
  if (changed.error) return serverError("Unable to update the glitch.", changed.error);
  const activity = await admin.from("glitch_activity").insert({ glitch_id: glitch.id, actor_id: principal.userId, event_type: eventType, message, metadata: { action } });
  if (activity.error) return serverError("The glitch changed, but its activity could not be recorded.", activity.error);
  const recipients: string[] = [];
  if (action === "assign" && update.assigned_to) recipients.push(update.assigned_to);
  if (action === "resolve" && glitch.reported_by) recipients.push(glitch.reported_by);
  if (action === "reopen") recipients.push(...[glitch.reported_by, glitch.assigned_to].filter((id): id is string => Boolean(id)));
  await notifyGlitch(recipients.filter((id) => id !== principal.userId).map((recipientId) => ({ recipientId, glitchId: glitch.id, reference: glitch.reference, kind: action, title: action === "resolve" ? `${glitch.reference} resolved` : action === "reopen" ? `${glitch.reference} reopened` : `${glitch.reference} assigned to you`, body: glitch.title })));
  return { updated: true };
}

function error(message: string) { return NextResponse.json({ error: message }, { status: 400 }); }
function forbidden() { return NextResponse.json({ error: "You are not allowed to perform this action." }, { status: 403 }); }
function serverError(message: string, cause: unknown) { console.error(message, cause); return NextResponse.json({ error: message }, { status: 500 }); }
function isUuid(value: unknown): value is string { return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
function optionalUuid(value: unknown) { return value === null || value === "" || value === undefined ? null : isUuid(value) ? value : null; }
