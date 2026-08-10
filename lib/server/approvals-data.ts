import "server-only";

import { APPROVAL_TYPE_BY_VALUE, FINANCIAL_REQUEST_TYPES, sourceHref } from "@/lib/approvals";
import type { Json } from "./supabase-database";
import type { StaffPrincipal } from "./staff-auth";
import { getSupabaseAdmin } from "./supabase-admin";

export type ApprovalPerson = { id: string; name: string; role: string };
export type ApprovalStep = {
  id: string;
  stepNumber: number;
  approverId: string | null;
  approverName: string | null;
  approverRole: string | null;
  status: string;
  decision: string | null;
  comment: string | null;
  actedBy: string | null;
  actedByName: string | null;
  actedAt: string | null;
  dueAt: string | null;
};
export type ApprovalActivity = { id: string; actor: string; action: string; comment: string | null; createdAt: string };
export type ApprovalComment = { id: string; author: string; body: string; visibility: string; createdAt: string };
export type ApprovalFinancialEvent = { id: string; type: string; amount: number; paymentMethod: string; transactionReference: string; recordedBy: string; occurredAt: string; notes: string | null };
export type ApprovalAttachment = { id: string; mediaAssetId: string; filename: string; contentType: string; byteSize: number | null; status: string; createdAt: string };
export type ApprovalItem = { id: string; galleryId: string; gallery: string; project: string; client: string; filename: string; caption: string | null; mediaStatus: string; submittedAt: string };

export type ApprovalRecord = {
  id: string;
  reference: string;
  requestType: string;
  requestTypeLabel: string;
  group: string;
  subject: string;
  description: string;
  priority: "normal" | "high" | "urgent";
  status: string;
  fulfillmentStatus: string | null;
  requesterId: string;
  requester: string;
  currentApprover: string;
  sourceModule: string;
  sourceRecordId: string | null;
  sourceReference: string | null;
  sourceHref: string;
  projectId: string | null;
  project: string | null;
  bookingId: string | null;
  clientId: string | null;
  employeeId: string | null;
  amount: number | null;
  currency: string;
  requiredBy: string | null;
  details: Record<string, Json | undefined>;
  notesToApprover: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  overdue: boolean;
  missingDocuments: boolean;
  canDecide: boolean;
  canWithdraw: boolean;
  canFulfill: boolean;
  canViewFinancials: boolean;
  steps: ApprovalStep[];
  activity: ApprovalActivity[];
  comments: ApprovalComment[];
  financialEvents: ApprovalFinancialEvent[];
  attachments: ApprovalAttachment[];
};

export type ApprovalDashboard = {
  records: ApprovalRecord[];
  role: StaffPrincipal["role"];
  userId: string | null;
  people: ApprovalPerson[];
  projects: Array<{ id: string; reference: string; title: string; clientId: string; bookingId: string | null }>;
  clients: Array<{ id: string; name: string }>;
  bookings: Array<{ id: string; reference: string; clientId: string }>;
  employees: Array<{ id: string; name: string; reference: string; staffId: string | null }>;
};

type RequestRow = {
  id: string; reference: string; request_type: string; subject: string; description: string; priority: "normal" | "high" | "urgent"; status: string; fulfillment_status: string | null;
  requester_id: string; source_module: string; source_record_id: string | null; source_reference: string | null; project_id: string | null; booking_id: string | null; client_id: string | null; employee_id: string | null;
  amount_php: number | null; currency: string; required_by: string | null; details: Json; notes_to_approver: string | null; submitted_at: string | null; completed_at: string | null; created_at: string; updated_at: string;
};
type StepRow = { id: string; request_id: string; step_number: number; approver_user_id: string | null; approver_role: string | null; status: string; decision: string | null; comment: string | null; acted_by: string | null; acted_at: string | null; due_at: string | null };
type AuditRow = { id: number; request_id: string; actor_id: string | null; action: string; comment: string | null; created_at: string };
type CommentRow = { id: string; request_id: string; author_id: string; body: string; visibility: string; created_at: string };
type EventRow = { id: string; request_id: string; event_type: string; amount_php: number; payment_method: string; transaction_reference: string; recorded_by: string; occurred_at: string; notes: string | null };
type AttachmentRow = { id: string; request_id: string; media_asset_id: string; created_at: string; media: { original_filename: string; mime_type: string; byte_size: number | null; status: string } | null };

export async function getApprovalDashboard(principal: StaffPrincipal): Promise<ApprovalDashboard> {
  const admin = getSupabaseAdmin();
  const [requestsResult, stepsResult, auditResult, commentsResult, eventsResult, attachmentsResult, peopleResult, projectsResult, clientsResult, bookingsResult, employeesResult] = await Promise.all([
    admin.from("approval_requests").select("id,reference,request_type,subject,description,priority,status,fulfillment_status,requester_id,source_module,source_record_id,source_reference,project_id,booking_id,client_id,employee_id,amount_php,currency,required_by,details,notes_to_approver,submitted_at,completed_at,created_at,updated_at").is("archived_at", null).order("created_at", { ascending: false }).limit(500),
    admin.from("approval_steps").select("id,request_id,step_number,approver_user_id,approver_role,status,decision,comment,acted_by,acted_at,due_at").order("step_number"),
    admin.from("approval_audit_log").select("id,request_id,actor_id,action,comment,created_at").order("created_at", { ascending: false }).limit(5000),
    admin.from("approval_comments").select("id,request_id,author_id,body,visibility,created_at").order("created_at"),
    admin.from("approval_financial_events").select("id,request_id,event_type,amount_php,payment_method,transaction_reference,recorded_by,occurred_at,notes").order("occurred_at"),
    admin.from("approval_attachments").select("id,request_id,media_asset_id,created_at,media:media_asset_id(original_filename,mime_type,byte_size,status)"),
    admin.from("staff_profiles").select("user_id,display_name,role").eq("active", true).order("display_name"),
    admin.from("projects").select("id,reference,title,client_id,booking_id").order("created_at", { ascending: false }).limit(500),
    admin.from("clients").select("id,name").eq("status", "active").order("name").limit(500),
    admin.from("bookings").select("id,reference,client_id").order("created_at", { ascending: false }).limit(500),
    admin.from("payroll_employees").select("id,name,employee_ref,staff_id").eq("status", "active").order("name"),
  ]);
  const failure = [requestsResult, stepsResult, auditResult, commentsResult, eventsResult, attachmentsResult, peopleResult, projectsResult, clientsResult, bookingsResult, employeesResult].find((result) => result.error)?.error;
  if (failure) throw failure;

  const people = (peopleResult.data ?? []).map((person) => ({ id: person.user_id, name: person.display_name, role: person.role }));
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const steps = (stepsResult.data ?? []) as StepRow[];
  const visibleRequests = ((requestsResult.data ?? []) as RequestRow[]).filter((request) => canViewRequest(request, steps, principal));
  const attachmentCounts = new Map<string, number>();
  for (const attachment of (attachmentsResult.data ?? []) as unknown as AttachmentRow[]) attachmentCounts.set(attachment.request_id, (attachmentCounts.get(attachment.request_id) ?? 0) + 1);
  const projects = (projectsResult.data ?? []).map((project) => ({ id: project.id, reference: project.reference, title: project.title, clientId: project.client_id, bookingId: project.booking_id }));
  const projectsById = new Map(projects.map((project) => [project.id, project]));

  const records = visibleRequests.map((request): ApprovalRecord => {
    const requestSteps = steps.filter((step) => step.request_id === request.id);
    const activeStep = requestSteps.find((step) => step.status === "pending");
    const financial = request.amount_php !== null || FINANCIAL_REQUEST_TYPES.has(request.request_type);
    const assigned = Boolean(activeStep && (activeStep.approver_user_id === principal.userId || !activeStep.approver_user_id && activeStep.approver_role === principal.role));
    const canViewFinancials = !financial || principal.role === "super_admin" || request.requester_id === principal.userId || assigned || principal.role === "admin" && requestSteps.some((step) => step.approver_role === "admin");
    const definition = APPROVAL_TYPE_BY_VALUE[request.request_type];
    const project = request.project_id ? projectsById.get(request.project_id) : null;
    return {
      id: request.id,
      reference: request.reference,
      requestType: request.request_type,
      requestTypeLabel: definition?.label ?? request.request_type.replaceAll("_", " "),
      group: definition?.group ?? "Other",
      subject: request.subject,
      description: request.description,
      priority: request.priority,
      status: request.status,
      fulfillmentStatus: request.fulfillment_status,
      requesterId: request.requester_id,
      requester: peopleById.get(request.requester_id)?.name ?? "Studio staff",
      currentApprover: activeStep?.approver_user_id ? peopleById.get(activeStep.approver_user_id)?.name ?? "Assigned staff" : roleLabel(activeStep?.approver_role),
      sourceModule: request.source_module,
      sourceRecordId: request.source_record_id,
      sourceReference: request.source_reference,
      sourceHref: sourceHref(request.source_module, request.source_reference),
      projectId: request.project_id,
      project: project ? `${project.reference} · ${project.title}` : null,
      bookingId: request.booking_id,
      clientId: request.client_id,
      employeeId: request.employee_id,
      amount: canViewFinancials ? request.amount_php : null,
      currency: request.currency,
      requiredBy: request.required_by,
      details: isObject(request.details) && canViewFinancials ? request.details : isObject(request.details) ? redactFinancialDetails(request.details) : {},
      notesToApprover: request.notes_to_approver,
      submittedAt: request.submitted_at,
      completedAt: request.completed_at,
      createdAt: request.created_at,
      updatedAt: request.updated_at,
      overdue: request.status === "pending_approval" && Boolean(request.required_by && request.required_by < manilaDate()),
      missingDocuments: requiresDocuments(request.request_type) && !attachmentCounts.get(request.id),
      canDecide: request.status === "pending_approval" && assigned && !(financial && request.requester_id === principal.userId),
      canWithdraw: request.requester_id === principal.userId && ["draft", "submitted", "pending_approval", "returned_for_changes"].includes(request.status),
      canFulfill: request.status === "approved" && financial && principal.role !== "staff",
      canViewFinancials,
      steps: requestSteps.map((step) => ({ id: step.id, stepNumber: step.step_number, approverId: step.approver_user_id, approverName: step.approver_user_id ? peopleById.get(step.approver_user_id)?.name ?? null : null, approverRole: step.approver_role, status: step.status, decision: step.decision, comment: step.comment, actedBy: step.acted_by, actedByName: step.acted_by ? peopleById.get(step.acted_by)?.name ?? null : null, actedAt: step.acted_at, dueAt: step.due_at })),
      activity: ((auditResult.data ?? []) as AuditRow[]).filter((item) => item.request_id === request.id).map((item) => ({ id: String(item.id), actor: item.actor_id ? peopleById.get(item.actor_id)?.name ?? "Studio staff" : "System", action: item.action, comment: item.comment, createdAt: item.created_at })),
      comments: ((commentsResult.data ?? []) as CommentRow[]).filter((item) => item.request_id === request.id && (item.visibility !== "internal" || principal.role === "super_admin")).map((item) => ({ id: item.id, author: peopleById.get(item.author_id)?.name ?? "Studio staff", body: item.body, visibility: item.visibility, createdAt: item.created_at })),
      financialEvents: canViewFinancials ? ((eventsResult.data ?? []) as EventRow[]).filter((item) => item.request_id === request.id).map((item) => ({ id: item.id, type: item.event_type, amount: item.amount_php, paymentMethod: item.payment_method, transactionReference: item.transaction_reference, recordedBy: peopleById.get(item.recorded_by)?.name ?? "Studio staff", occurredAt: item.occurred_at, notes: item.notes })) : [],
      attachments: ((attachmentsResult.data ?? []) as unknown as AttachmentRow[]).filter((item) => item.request_id === request.id).map((item) => ({ id: item.id, mediaAssetId: item.media_asset_id, filename: item.media?.original_filename ?? "Supporting file", contentType: item.media?.mime_type ?? "application/octet-stream", byteSize: item.media?.byte_size ?? null, status: item.media?.status ?? "uploaded", createdAt: item.created_at })),
    };
  }).sort(defaultApprovalSort);

  return {
    records,
    role: principal.role,
    userId: principal.userId,
    people,
    projects,
    clients: clientsResult.data ?? [],
    bookings: (bookingsResult.data ?? []).map((booking) => ({ id: booking.id, reference: booking.reference, clientId: booking.client_id })),
    employees: (employeesResult.data ?? []).map((employee) => ({ id: employee.id, name: employee.name, reference: employee.employee_ref, staffId: employee.staff_id })),
  };
}

export async function getPendingApprovalCount(principal: StaffPrincipal) {
  const stepsResult = await getSupabaseAdmin().from("approval_steps").select("request_id,approver_user_id,approver_role").eq("status", "pending");
  if (stepsResult.error) throw stepsResult.error;
  const assignedIds = (stepsResult.data ?? []).filter((step) => step.approver_user_id === principal.userId || !step.approver_user_id && step.approver_role === principal.role).map((step) => step.request_id);
  if (!assignedIds.length) return 0;
  const requests = await getSupabaseAdmin().from("approval_requests").select("id,requester_id,amount_php").in("id", assignedIds).eq("status", "pending_approval").is("archived_at", null);
  if (requests.error) throw requests.error;
  return (requests.data ?? []).filter((request) => request.amount_php === null || request.requester_id !== principal.userId).length;
}

// Retained while the gallery-review screen is migrated to the generalized approvals workflow.
export async function getPendingApprovals(): Promise<ApprovalItem[]> {
  const result = await getSupabaseAdmin().from("gallery_assets").select(`
    id, gallery_id, caption, created_at,
    media:media_asset_id ( original_filename, status ),
    gallery:gallery_id ( title, project:project_id ( reference, title ), client:client_id ( name ) )
  `).eq("approval_status", "pending").order("created_at", { ascending: true }).limit(200);
  if (result.error) throw result.error;
  type LegacyRow = { id: string; gallery_id: string; caption: string | null; created_at: string; media: { original_filename: string; status: string } | null; gallery: { title: string; project: { reference: string; title: string } | null; client: { name: string } | null } | null };
  return (result.data as unknown as LegacyRow[]).map((item) => ({ id: item.id, galleryId: item.gallery_id, gallery: item.gallery?.title ?? "Untitled gallery", project: item.gallery?.project ? `${item.gallery.project.reference} · ${item.gallery.project.title}` : "Unlinked project", client: item.gallery?.client?.name ?? "Unknown client", filename: item.media?.original_filename ?? "Media asset", caption: item.caption, mediaStatus: item.media?.status ?? "processing", submittedAt: item.created_at }));
}

function canViewRequest(request: RequestRow, steps: StepRow[], principal: StaffPrincipal) {
  if (principal.role === "super_admin" || request.requester_id === principal.userId) return true;
  if (steps.some((step) => step.request_id === request.id && (step.approver_user_id === principal.userId || !step.approver_user_id && step.approver_role === principal.role))) return true;
  return principal.role === "admin" && request.amount_php === null;
}

function defaultApprovalSort(a: ApprovalRecord, b: ApprovalRecord) {
  if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
  if (a.priority !== b.priority) return ({ urgent: 0, high: 1, normal: 2 })[a.priority] - ({ urgent: 0, high: 1, normal: 2 })[b.priority];
  return new Date(a.submittedAt ?? a.createdAt).getTime() - new Date(b.submittedAt ?? b.createdAt).getTime();
}

function isObject(value: Json): value is Record<string, Json | undefined> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function redactFinancialDetails(details: Record<string, Json | undefined>) {
  return Object.fromEntries(Object.entries(details).filter(([key]) => !/(amount|cost|budget|spent|supplier|payment|breakdown|reimbursement)/i.test(key)));
}

function requiresDocuments(requestType: string) {
  return requestType.startsWith("purchase_") || ["cash_advance_liquidation", "expense_reimbursement"].includes(requestType);
}

function roleLabel(role?: string | null) {
  if (role === "super_admin") return "Super Admin";
  if (role === "admin") return "Admin";
  if (role === "staff") return "Assigned staff";
  return "Not assigned";
}

function manilaDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
