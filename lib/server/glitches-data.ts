import "server-only";

import type { StaffPrincipal } from "./staff-auth";
import { getSupabaseAdmin } from "./supabase-admin";
import type { GlitchCategory, GlitchSeverity, GlitchStatus } from "@/lib/glitches";
import { ACTIVE_GLITCH_STATUSES } from "@/lib/glitches";

export type GlitchPerson = { id: string; name: string };
export type GlitchOption = { id: string; label: string };
export type GlitchActivity = { id: number; eventType: string; message: string; actor: string; createdAt: string };
export type GlitchAttachment = { id: string; filename: string; contentType: string; byteSize: number; uploadedBy: string; createdAt: string };

export type GlitchRecord = {
  id: string;
  reference: string;
  title: string;
  description: string;
  category: GlitchCategory;
  severity: GlitchSeverity;
  status: GlitchStatus;
  locationOrSystem: string | null;
  operationsBlocked: boolean;
  workaround: string | null;
  resolutionSummary: string | null;
  reportedById: string | null;
  reportedBy: string;
  assignedToId: string | null;
  assignedTo: string | null;
  resolvedBy: string | null;
  bookingId: string | null;
  booking: string | null;
  projectId: string | null;
  project: string | null;
  clientId: string | null;
  client: string | null;
  linkedTaskId: string | null;
  linkedTask: string | null;
  observedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  activities: GlitchActivity[];
  attachments: GlitchAttachment[];
};

export type GlitchesWorkspace = {
  glitches: GlitchRecord[];
  staff: GlitchPerson[];
  bookings: GlitchOption[];
  projects: GlitchOption[];
  clients: GlitchOption[];
  tasks: GlitchOption[];
  viewer: { id: string | null; name: string; role: StaffPrincipal["role"] };
};

type RawGlitch = {
  id: string; reference: string; title: string; description: string; category: GlitchCategory; severity: GlitchSeverity; status: GlitchStatus;
  location_or_system: string | null; operations_blocked: boolean; workaround: string | null; resolution_summary: string | null;
  reporter_name: string | null; reported_by: string | null; assigned_to: string | null; resolved_by: string | null;
  booking_id: string | null; project_id: string | null; client_id: string | null; linked_task_id: string | null;
  observed_at: string; resolved_at: string | null; closed_at: string | null; created_at: string; updated_at: string;
};

export async function getGlitchesWorkspace(principal: StaffPrincipal): Promise<GlitchesWorkspace> {
  const admin = getSupabaseAdmin();
  let glitchQuery = admin.from("glitches").select("id,reference,title,description,category,severity,status,location_or_system,operations_blocked,workaround,resolution_summary,reporter_name,reported_by,assigned_to,resolved_by,booking_id,project_id,client_id,linked_task_id,observed_at,resolved_at,closed_at,created_at,updated_at").is("archived_at", null);
  if (principal.role === "staff") {
    if (!principal.userId) glitchQuery = glitchQuery.eq("id", "00000000-0000-0000-0000-000000000000");
    else glitchQuery = glitchQuery.or(`reported_by.eq.${principal.userId},assigned_to.eq.${principal.userId}`);
  }

  const [glitchResult, staffResult, bookingResult, projectResult, clientResult, taskResult] = await Promise.all([
    glitchQuery.order("created_at", { ascending: false }).limit(500),
    admin.from("staff_profiles").select("user_id,display_name").eq("active", true).order("display_name"),
    admin.from("bookings").select("id,reference,service_type").order("created_at", { ascending: false }).limit(500),
    admin.from("projects").select("id,reference,title").order("created_at", { ascending: false }).limit(500),
    admin.from("clients").select("id,external_ref,name").order("name").limit(500),
    admin.from("tasks").select("id,title,linked_ref").order("created_at", { ascending: false }).limit(500),
  ]);
  const firstError = [glitchResult.error, staffResult.error, bookingResult.error, projectResult.error, clientResult.error, taskResult.error].find(Boolean);
  if (firstError) throw firstError;

  const rawGlitches = (glitchResult.data ?? []) as RawGlitch[];
  const ids = rawGlitches.map((item) => item.id);
  const [activityResult, attachmentResult] = ids.length ? await Promise.all([
    admin.from("glitch_activity").select("id,glitch_id,actor_id,event_type,message,created_at").in("glitch_id", ids).order("created_at", { ascending: false }),
    admin.from("glitch_attachments").select("id,glitch_id,filename,content_type,byte_size,uploaded_by,created_at").in("glitch_id", ids).order("created_at"),
  ]) : [{ data: [], error: null }, { data: [], error: null }];
  if (activityResult.error) throw activityResult.error;
  if (attachmentResult.error) throw attachmentResult.error;

  const staff = (staffResult.data ?? []).map((item) => ({ id: item.user_id, name: item.display_name }));
  const names = new Map(staff.map((item) => [item.id, item.name]));
  const bookings = (bookingResult.data ?? []).map((item) => ({ id: item.id, label: `${item.reference} · ${item.service_type}` }));
  const projects = (projectResult.data ?? []).map((item) => ({ id: item.id, label: `${item.reference} · ${item.title}` }));
  const clients = (clientResult.data ?? []).map((item) => ({ id: item.id, label: `${item.external_ref} · ${item.name}` }));
  const tasks = (taskResult.data ?? []).map((item) => ({ id: item.id, label: `${item.title}${item.linked_ref ? ` · ${item.linked_ref}` : ""}` }));
  const optionName = (options: GlitchOption[], id: string | null) => options.find((item) => item.id === id)?.label ?? null;

  const activities = activityResult.data ?? [];
  const attachments = attachmentResult.data ?? [];
  return {
    glitches: rawGlitches.map((item) => ({
      id: item.id, reference: item.reference, title: item.title, description: item.description, category: item.category, severity: item.severity, status: item.status,
      locationOrSystem: item.location_or_system, operationsBlocked: item.operations_blocked, workaround: item.workaround, resolutionSummary: item.resolution_summary,
      reportedById: item.reported_by, reportedBy: names.get(item.reported_by ?? "") ?? item.reporter_name ?? "Former staff member",
      assignedToId: item.assigned_to, assignedTo: names.get(item.assigned_to ?? "") ?? null, resolvedBy: names.get(item.resolved_by ?? "") ?? null,
      bookingId: item.booking_id, booking: optionName(bookings, item.booking_id), projectId: item.project_id, project: optionName(projects, item.project_id), clientId: item.client_id, client: optionName(clients, item.client_id), linkedTaskId: item.linked_task_id, linkedTask: optionName(tasks, item.linked_task_id),
      observedAt: item.observed_at, resolvedAt: item.resolved_at, closedAt: item.closed_at, createdAt: item.created_at, updatedAt: item.updated_at,
      activities: activities.filter((event) => event.glitch_id === item.id).map((event) => ({ id: event.id, eventType: event.event_type, message: event.message, actor: names.get(event.actor_id ?? "") ?? "System", createdAt: event.created_at })),
      attachments: attachments.filter((attachment) => attachment.glitch_id === item.id).map((attachment) => ({ id: attachment.id, filename: attachment.filename, contentType: attachment.content_type, byteSize: attachment.byte_size, uploadedBy: names.get(attachment.uploaded_by ?? "") ?? "Former staff member", createdAt: attachment.created_at })),
    })),
    staff, bookings, projects, clients, tasks,
    viewer: { id: principal.userId, name: names.get(principal.userId ?? "") ?? principal.email, role: principal.role },
  };
}

export async function getGlitchNavigationCounts(principal: StaffPrincipal) {
  let query = getSupabaseAdmin().from("glitches").select("id", { count: "exact", head: true }).in("status", ACTIVE_GLITCH_STATUSES).is("archived_at", null);
  if (principal.role === "staff") {
    if (!principal.userId) return { active: 0 };
    query = query.or(`reported_by.eq.${principal.userId},assigned_to.eq.${principal.userId}`);
  }
  const result = await query;
  if (result.error) throw result.error;
  return { active: result.count ?? 0 };
}
