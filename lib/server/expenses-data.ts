/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";

import type { StaffPrincipal } from "./staff-auth";
import { getSupabaseAdmin } from "./supabase-admin";

export type ExpenseWorkspaceRow = {
  id: string;
  reference: string;
  vendor: string;
  categoryId: string;
  category: string;
  description: string;
  transactionDate: string;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  receiptStatus: string;
  receiptException: string | null;
  paymentMethod: string | null;
  paymentSource: string | null;
  paidByType: string;
  projectId: string | null;
  projectReference: string | null;
  projectTitle: string | null;
  allocationLabel: string;
  reimbursementState: string;
  ownerFunded: boolean;
  ownerAdvanceId: string | null;
  ownerAdvanceStatus: string | null;
  amountRepaid: number;
  recurringTemplateId: string | null;
  duplicateSuspected: boolean;
  duplicateOf: string | null;
  invoiceNumber: string | null;
  receiptNumber: string | null;
  internalNote: string | null;
  submitter: string;
  submitterId: string | null;
  reviewer: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  paymentDate: string | null;
  version: number;
  allocations: Array<{ id: string; type: string; projectId: string | null; label: string; amount: number }>;
  attachments: Array<{ id: string; type: string; status: string; filename: string }>;
  activity: Array<{ id: number; action: string; reason: string | null; actor: string; at: string }>;
};

export type ExpenseWorkspaceData = {
  rows: ExpenseWorkspaceRow[];
  categories: Array<{ id: string; name: string; requiresProject: boolean; receiptThreshold: number | null }>;
  paymentSources: Array<{ id: string; name: string; method: string; sourceType: string }>;
  projects: Array<{ id: string; reference: string; title: string; bookingId: string | null }>;
  equipment: Array<{ id: string; label: string }>;
  maintenance: Array<{ id: string; label: string }>;
  staff: Array<{ id: string; name: string; role: string }>;
  recurring: Array<{ id: string; vendor: string; amount: number; frequency: string; nextDue: string; state: string }>;
  summary: {
    thisMonth: number;
    previousMonth: number | null;
    needsReviewCount: number;
    needsReviewAmount: number;
    ownerAdvanced: number;
    ownerRepaid: number;
    ownerOutstanding: number;
  };
  canManage: boolean;
  canSubmitReimbursement: boolean;
};

export async function getExpenseWorkspace(principal: StaffPrincipal): Promise<ExpenseWorkspaceData> {
  if (!principal.userId) return emptyWorkspace(principal.role !== "staff");
  const admin = getSupabaseAdmin();
  const [expenseResult, categoriesResult, sourcesResult, projectsResult, staffResult, allocationsResult, advancesResult, attachmentsResult, reviewsResult, recurringResult, claimsResult, equipmentResult, maintenanceResult] = await Promise.all([
    admin.from("expenses").select("*").order("expense_date", { ascending: false }).limit(1000),
    admin.from("expense_categories").select("id,name,requires_project,receipt_threshold_centavos,active").eq("active", true).order("name"),
    admin.from("expense_payment_sources").select("id,name,method,source_type,active").eq("active", true).order("name"),
    admin.from("projects").select("id,reference,title,booking_id,status").order("created_at", { ascending: false }).limit(500),
    admin.from("staff_profiles").select("user_id,display_name,role,active").eq("active", true).order("display_name"),
    admin.from("expense_allocations").select("*").limit(3000),
    admin.from("owner_advances").select("*").limit(1000),
    admin.from("expense_attachments").select("id,expense_id,document_type,verification_status,media_asset_id,removed_at").is("removed_at", null).limit(2000),
    admin.from("expense_reviews").select("id,expense_id,actor_id,action,reason,created_at").order("created_at", { ascending: false }).limit(5000),
    admin.from("recurring_expense_templates").select("id,vendor_name_snapshot,expected_amount_centavos,frequency,next_due_date,state").order("next_due_date").limit(500),
    admin.from("reimbursement_claims").select("expense_id,staff_id").limit(1000),
    admin.from("equipment").select("id,serial,name,status").order("name").limit(500),
    admin.from("maintenance_records").select("id,task,asset_label,status").order("created_at", { ascending: false }).limit(500),
  ]);
  const firstError = [expenseResult, categoriesResult, sourcesResult, projectsResult, staffResult, allocationsResult, advancesResult, attachmentsResult, reviewsResult, recurringResult, claimsResult, equipmentResult, maintenanceResult].find((result) => result.error)?.error;
  if (firstError) throw firstError;

  const allExpenses = expenseResult.data ?? [];
  const ownClaimIds = new Set((claimsResult.data ?? []).filter((claim) => claim.staff_id === principal.userId).map((claim) => claim.expense_id));
  const expenses = principal.role === "staff" ? allExpenses.filter((expense) => expense.created_by === principal.userId || expense.submitted_by === principal.userId || ownClaimIds.has(expense.id)) : allExpenses;
  const allowedIds = new Set(expenses.map((expense) => expense.id));
  const projects = new Map((projectsResult.data ?? []).map((project) => [project.id, project]));
  const people = new Map((staffResult.data ?? []).map((person) => [person.user_id, person.display_name]));
  const sources = new Map((sourcesResult.data ?? []).map((source) => [source.id, source.name]));
  const allocationsByExpense = groupBy((allocationsResult.data ?? []).filter((row) => allowedIds.has(row.expense_id)), "expense_id");
  const visibleAdvances = principal.role === "staff" ? [] : advancesResult.data ?? [];
  const advances = new Map(visibleAdvances.map((advance) => [advance.expense_id, advance]));
  const reviewsByExpense = groupBy((reviewsResult.data ?? []).filter((row) => allowedIds.has(row.expense_id)), "expense_id");
  const attachmentRows = (attachmentsResult.data ?? []).filter((row) => allowedIds.has(row.expense_id));
  const mediaIds = attachmentRows.map((row) => row.media_asset_id);
  const mediaResult = mediaIds.length ? await admin.from("media_assets").select("id,original_filename").in("id", mediaIds) : { data: [], error: null };
  if (mediaResult.error) throw mediaResult.error;
  const filenames = new Map((mediaResult.data ?? []).map((media) => [media.id, media.original_filename]));
  const attachmentsByExpense = groupBy(attachmentRows, "expense_id");

  const rows: ExpenseWorkspaceRow[] = expenses.map((expense) => {
    const allocations = allocationsByExpense.get(expense.id) ?? [];
    const projectAllocation = allocations.find((allocation) => allocation.project_id);
    const project = projectAllocation?.project_id ? projects.get(projectAllocation.project_id) : null;
    const advance = advances.get(expense.id);
    const reviews = reviewsByExpense.get(expense.id) ?? [];
    return {
      id: expense.id, reference: expense.reference, vendor: expense.vendor_name_snapshot,
      categoryId: expense.category_id, category: expense.category, description: expense.description,
      transactionDate: expense.expense_date, subtotal: expense.subtotal_amount_centavos,
      tax: expense.tax_amount_centavos, total: expense.total_amount_centavos, status: expense.status,
      receiptStatus: expense.receipt_status, receiptException: expense.receipt_exception_reason,
      paymentMethod: expense.payment_method, paymentSource: expense.payment_source_id ? sources.get(expense.payment_source_id) ?? null : null,
      paidByType: expense.paid_by_type, projectId: project?.id ?? null, projectReference: project?.reference ?? null,
      projectTitle: project?.title ?? null, allocationLabel: allocationLabel(allocations, projects),
      reimbursementState: expense.reimbursement_state, ownerFunded: expense.owner_funded,
      ownerAdvanceId: advance?.id ?? null, ownerAdvanceStatus: advance?.status ?? null,
      amountRepaid: advance?.amount_repaid_centavos ?? 0, recurringTemplateId: expense.recurring_template_id,
      duplicateSuspected: expense.duplicate_suspected, duplicateOf: expense.duplicate_of, invoiceNumber: expense.invoice_number,
      receiptNumber: expense.receipt_number, internalNote: expense.internal_note,
      submitter: expense.submitted_by ? people.get(expense.submitted_by) ?? "Studio staff" : people.get(expense.created_by ?? "") ?? "Studio staff",
      submitterId: expense.submitted_by ?? expense.created_by,
      reviewer: expense.approved_by ? people.get(expense.approved_by) ?? "Studio reviewer" : null,
      submittedAt: expense.submitted_at, approvedAt: expense.approved_at, paymentDate: expense.payment_date,
      version: expense.version,
      allocations: allocations.map((allocation) => ({ id: allocation.id, type: allocation.allocation_type, projectId: allocation.project_id, label: allocation.project_id ? projects.get(allocation.project_id)?.reference ?? "Project" : String(allocation.allocation_type).replaceAll("_", " "), amount: allocation.amount_centavos })),
      attachments: (attachmentsByExpense.get(expense.id) ?? []).map((attachment) => ({ id: attachment.id, type: attachment.document_type, status: attachment.verification_status, filename: filenames.get(attachment.media_asset_id) ?? "Supporting document" })),
      activity: reviews.map((review) => ({ id: review.id, action: review.action, reason: review.reason, actor: review.actor_id ? people.get(review.actor_id) ?? "Studio staff" : "System", at: review.created_at })),
    };
  });

  return {
    rows,
    categories: (categoriesResult.data ?? []).map((category) => ({ id: category.id, name: category.name, requiresProject: category.requires_project, receiptThreshold: category.receipt_threshold_centavos })),
    paymentSources: (sourcesResult.data ?? []).map((source) => ({ id: source.id, name: source.name, method: source.method, sourceType: source.source_type })),
    projects: (projectsResult.data ?? []).map((project) => ({ id: project.id, reference: project.reference, title: project.title, bookingId: project.booking_id })),
    equipment: principal.role === "staff" ? [] : (equipmentResult.data ?? []).map((item) => ({ id: item.id, label: `${item.serial} · ${item.name}` })),
    maintenance: principal.role === "staff" ? [] : (maintenanceResult.data ?? []).map((item) => ({ id: item.id, label: `${item.asset_label} · ${item.task}` })),
    staff: (staffResult.data ?? []).filter((person) => principal.role !== "staff" || person.user_id === principal.userId).map((person) => ({ id: person.user_id, name: person.display_name, role: person.role })),
    recurring: principal.role === "staff" ? [] : (recurringResult.data ?? []).map((template) => ({ id: template.id, vendor: template.vendor_name_snapshot, amount: template.expected_amount_centavos, frequency: template.frequency, nextDue: template.next_due_date, state: template.state })),
    summary: summarize(rows, visibleAdvances),
    canManage: principal.role !== "staff",
    canSubmitReimbursement: true,
  };
}

function summarize(rows: ExpenseWorkspaceRow[], advances: any[]) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit" }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  const previous = new Date(Date.UTC(year, month - 2, 1));
  const previousKey = `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, "0")}`;
  const valid = rows.filter((row) => ["approved", "scheduled_for_payment", "paid"].includes(row.status) && !row.duplicateOf);
  const thisMonth = valid.filter((row) => row.transactionDate.startsWith(monthKey)).reduce((sum, row) => sum + row.total, 0);
  const previousRows = valid.filter((row) => row.transactionDate.startsWith(previousKey));
  const reviewRows = rows.filter((row) => ["submitted", "needs_review"].includes(row.status));
  const activeAdvances = advances.filter((advance) => advance.status !== "voided");
  const ownerAdvanced = activeAdvances.reduce((sum, advance) => sum + advance.amount_advanced_centavos, 0);
  const ownerRepaid = activeAdvances.reduce((sum, advance) => sum + advance.amount_repaid_centavos, 0);
  return { thisMonth, previousMonth: previousRows.length ? previousRows.reduce((sum, row) => sum + row.total, 0) : null, needsReviewCount: reviewRows.length, needsReviewAmount: reviewRows.reduce((sum, row) => sum + row.total, 0), ownerAdvanced, ownerRepaid, ownerOutstanding: ownerAdvanced - ownerRepaid };
}

function allocationLabel(allocations: any[], projects: Map<string, any>) {
  if (allocations.length > 1) return `${allocations.length} destinations`;
  const allocation = allocations[0];
  if (!allocation) return "Unallocated";
  if (allocation.project_id) return projects.get(allocation.project_id)?.reference ?? "Project";
  return String(allocation.allocation_type).replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function groupBy<T extends Record<string, any>>(rows: T[], key: keyof T) {
  const grouped = new Map<string, T[]>();
  for (const row of rows) grouped.set(row[key], [...(grouped.get(row[key]) ?? []), row]);
  return grouped;
}

function emptyWorkspace(canManage: boolean): ExpenseWorkspaceData {
  return { rows: [], categories: [], paymentSources: [], projects: [], equipment: [], maintenance: [], staff: [], recurring: [], summary: { thisMonth: 0, previousMonth: null, needsReviewCount: 0, needsReviewAmount: 0, ownerAdvanced: 0, ownerRepaid: 0, ownerOutstanding: 0 }, canManage, canSubmitReimbursement: true };
}
