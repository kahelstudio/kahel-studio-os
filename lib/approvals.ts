export const APPROVAL_STATUSES = [
  "Draft",
  "Submitted",
  "Pending Approval",
  "Returned for Changes",
  "Approved",
  "Rejected",
  "Cancelled",
  "Withdrawn",
] as const;

export const FULFILLMENT_STATUSES = [
  "Not Released",
  "Partially Released",
  "Released",
  "Awaiting Liquidation",
  "Liquidation Submitted",
  "Liquidated",
  "Awaiting Payment",
  "Paid",
] as const;

export const APPROVAL_PRIORITIES = ["Normal", "High", "Urgent"] as const;

export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];
export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];
export type ApprovalPriority = (typeof APPROVAL_PRIORITIES)[number];

export const APPROVAL_STATUS_LABELS: Record<string, ApprovalStatus> = {
  draft: "Draft",
  submitted: "Submitted",
  pending_approval: "Pending Approval",
  returned_for_changes: "Returned for Changes",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  withdrawn: "Withdrawn",
};

export type ApprovalTypeGroup = "Projects" | "Attendance" | "Purchases" | "Cash Advances" | "Expenses" | "Finance" | "People" | "Other";

export type ApprovalField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "date" | "number" | "checkbox";
  required?: boolean;
  placeholder?: string;
};

export type ApprovalTypeDefinition = {
  value: string;
  label: string;
  group: ApprovalTypeGroup;
  sourceModule: string;
  financial?: boolean;
  sensitive?: boolean;
  bulkEligible?: boolean;
  fields: ApprovalField[];
};

const reason: ApprovalField = { key: "reason", label: "Reason", type: "textarea", required: true };
const affectedDate: ApprovalField = { key: "affectedDate", label: "Affected date", type: "date", required: true };
const projectChangeFields: ApprovalField[] = [
  { key: "requestedChange", label: "Requested change", type: "textarea", required: true },
  reason,
  { key: "scheduleImpact", label: "Schedule impact", type: "textarea" },
  { key: "budgetImpact", label: "Budget impact", type: "number" },
  { key: "deliverablesAffected", label: "Deliverables affected", type: "textarea" },
];
const attendanceFields: ApprovalField[] = [
  affectedDate,
  { key: "originalRecord", label: "Original time or schedule", type: "text", required: true },
  { key: "requestedRecord", label: "Requested correction or schedule", type: "text", required: true },
  { key: "affectedHours", label: "Total affected hours", type: "number" },
  reason,
  { key: "supportingEvidence", label: "Supporting evidence", type: "textarea" },
];
const purchaseFields: ApprovalField[] = [
  { key: "item", label: "Item or service", type: "text", required: true },
  { key: "specification", label: "Description and specification", type: "textarea", required: true },
  { key: "quantity", label: "Quantity", type: "number", required: true },
  { key: "estimatedUnitCost", label: "Estimated unit cost", type: "number", required: true },
  { key: "preferredSupplier", label: "Preferred supplier", type: "text" },
  { key: "alternativeSupplier", label: "Alternative supplier", type: "text" },
  { key: "businessPurpose", label: "Business purpose", type: "textarea", required: true },
  { key: "budgetCategory", label: "Budget category", type: "text" },
];
const cashAdvanceFields: ApprovalField[] = [
  { key: "purpose", label: "Purpose", type: "textarea", required: true },
  { key: "expectedLiquidationDate", label: "Expected liquidation date", type: "date", required: true },
  { key: "expenseCategory", label: "Expense category", type: "text", required: true },
  { key: "paymentMethod", label: "Payment method", type: "text", required: true },
  { key: "recipient", label: "Recipient", type: "text", required: true },
  { key: "estimateBreakdown", label: "Estimate or breakdown", type: "textarea", required: true },
  { key: "liquidationAcknowledged", label: "I acknowledge the liquidation requirements", type: "checkbox", required: true },
];

function type(value: string, label: string, group: ApprovalTypeGroup, sourceModule: string, fields: ApprovalField[], options: Pick<ApprovalTypeDefinition, "financial" | "sensitive" | "bulkEligible"> = {}): ApprovalTypeDefinition {
  return { value, label, group, sourceModule, fields, ...options };
}

export const APPROVAL_TYPES: ApprovalTypeDefinition[] = [
  type("new_project", "New project approval", "Projects", "projects", projectChangeFields),
  type("project_brief", "Project brief approval", "Projects", "projects", projectChangeFields, { bulkEligible: true }),
  type("project_budget", "Budget approval", "Projects", "projects", projectChangeFields, { financial: true, sensitive: true }),
  type("scope_change", "Scope change", "Projects", "projects", projectChangeFields),
  type("deadline_extension", "Deadline extension", "Projects", "projects", projectChangeFields),
  type("additional_deliverables", "Additional deliverables", "Projects", "projects", projectChangeFields),
  type("production_milestone", "Production milestone approval", "Projects", "projects", projectChangeFields, { bulkEligible: true }),
  type("project_closeout", "Project completion or closeout", "Projects", "projects", projectChangeFields),
  type("client_change", "Client-requested change", "Projects", "projects", projectChangeFields),
  type("attendance_correction", "Attendance correction", "Attendance", "attendance", attendanceFields, { bulkEligible: true }),
  type("missed_clock", "Missed clock-in or clock-out", "Attendance", "attendance", attendanceFields, { bulkEligible: true }),
  type("leave_request", "Leave request", "Attendance", "attendance", attendanceFields, { bulkEligible: true }),
  type("schedule_adjustment", "Schedule adjustment", "Attendance", "shiftboard", attendanceFields, { bulkEligible: true }),
  type("shift_swap", "Shift swap", "Attendance", "shiftboard", attendanceFields, { bulkEligible: true }),
  type("work_from_home", "Work-from-home request", "Attendance", "attendance", attendanceFields),
  type("exceptional_overtime", "Exceptional shift extension or overtime", "Attendance", "attendance", attendanceFields, { sensitive: true }),
  type("attendance_explanation", "Late arrival or early departure explanation", "Attendance", "attendance", attendanceFields, { bulkEligible: true }),
  type("purchase_equipment", "Equipment purchase", "Purchases", "inventory", purchaseFields, { financial: true }),
  type("purchase_consumables", "Consumables purchase", "Purchases", "inventory", purchaseFields, { financial: true, bulkEligible: true }),
  type("purchase_office", "Office supplies purchase", "Purchases", "expenses", purchaseFields, { financial: true, bulkEligible: true }),
  type("purchase_software", "Software or subscription", "Purchases", "expenses", purchaseFields, { financial: true }),
  type("purchase_production", "Production materials", "Purchases", "projects", purchaseFields, { financial: true }),
  type("purchase_facility", "Facility supplies", "Purchases", "maintenance", purchaseFields, { financial: true }),
  type("purchase_repair_parts", "Repair parts", "Purchases", "maintenance", purchaseFields, { financial: true }),
  type("purchase_other", "Other business purchase", "Purchases", "expenses", purchaseFields, { financial: true }),
  type("cash_advance", "Cash advance", "Cash Advances", "expenses", cashAdvanceFields, { financial: true, sensitive: true }),
  type("cash_advance_liquidation", "Cash advance liquidation", "Cash Advances", "expenses", [
    { key: "originalAdvanceReference", label: "Original cash advance", type: "text", required: true },
    { key: "amountReleased", label: "Amount released", type: "number", required: true },
    { key: "totalSpent", label: "Total spent", type: "number", required: true },
    { key: "amountReturned", label: "Amount returned to the studio", type: "number" },
    { key: "reimbursementRequested", label: "Additional reimbursement requested", type: "number" },
    { key: "liquidationDate", label: "Liquidation date", type: "date", required: true },
    { key: "itemizedExpenses", label: "Itemized actual expenses", type: "textarea", required: true },
  ], { financial: true, sensitive: true }),
  type("expense_reimbursement", "Expense reimbursement", "Expenses", "expenses", [
    { key: "expenseDate", label: "Expense date", type: "date", required: true },
    { key: "category", label: "Category", type: "text", required: true },
    { key: "paymentMethod", label: "Payment method originally used", type: "text", required: true },
    { key: "priorApprovalReason", label: "Why prior approval was not used", type: "textarea" },
  ], { financial: true, sensitive: true }),
  type("supplier_payment", "Supplier payment", "Finance", "expenses", [reason], { financial: true, sensitive: true }),
  type("client_refund", "Client refund", "Finance", "finance", [reason], { financial: true, sensitive: true }),
  type("discount", "Discount approval", "Finance", "quotation", [reason], { financial: true, sensitive: true }),
  type("payroll_adjustment", "Payroll adjustment", "People", "payroll", [reason], { financial: true, sensitive: true }),
  type("equipment_repair", "Equipment repair", "Other", "maintenance", [reason], { financial: true }),
  type("equipment_replacement", "Equipment replacement", "Other", "inventory", [reason], { financial: true, sensitive: true }),
  type("asset_disposal", "Asset disposal", "Other", "inventory", [reason], { sensitive: true }),
  type("policy_exception", "Policy exception", "Other", "policies", [reason], { sensitive: true }),
  type("access_request", "Access request", "Other", "settings", [reason], { sensitive: true }),
  type("other", "Other internal request", "Other", "other", [reason]),
];

export const APPROVAL_TYPE_BY_VALUE = Object.fromEntries(APPROVAL_TYPES.map((item) => [item.value, item])) as Record<string, ApprovalTypeDefinition>;

export const FINANCIAL_REQUEST_TYPES = new Set(APPROVAL_TYPES.filter((item) => item.financial).map((item) => item.value));
export const SENSITIVE_REQUEST_TYPES = new Set(APPROVAL_TYPES.filter((item) => item.sensitive).map((item) => item.value));
export const BULK_ELIGIBLE_REQUEST_TYPES = new Set(APPROVAL_TYPES.filter((item) => item.bulkEligible && !item.sensitive).map((item) => item.value));

export function validateApprovalDetails(requestType: string, details: Record<string, unknown>) {
  const definition = APPROVAL_TYPE_BY_VALUE[requestType];
  if (!definition) return ["Choose a valid request type."];
  return definition.fields.flatMap((field) => {
    const value = details[field.key];
    const empty = value === null || value === undefined || value === "";
    if (empty) return field.required ? [`${field.label} is required.`] : [];
    if (field.type === "checkbox") return value === true || !field.required && value === false ? [] : [`${field.label} is required.`];
    if (field.type === "number") return typeof value === "number" && Number.isFinite(value) && value >= 0 ? [] : [`${field.label} must be a valid non-negative number.`];
    if (field.type === "date") {
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return [`${field.label} must be a valid date.`];
      const parsed = new Date(`${value}T00:00:00Z`);
      return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? [] : [`${field.label} must be a valid date.`];
    }
    return typeof value === "string" && value.trim().length <= 2000 ? [] : [`${field.label} is invalid.`];
  });
}

export function calculateLiquidation(released: number, spent: number, returned = 0) {
  const difference = spent - released;
  return {
    totalLiquidated: spent,
    remainingToReturn: Math.max(released - spent - returned, 0),
    excessEligibleForReimbursement: Math.max(difference, 0),
    difference,
  };
}

export function sourceHref(sourceModule: string, sourceReference?: string | null) {
  const encoded = sourceReference ? encodeURIComponent(sourceReference) : "";
  if (sourceModule === "projects") return encoded ? `/projects/${encoded}` : "/projects/pipeline";
  if (sourceModule === "booking") return encoded ? `/booking/list/${encoded}` : "/booking/list";
  if (sourceModule === "attendance") return "/attendance/timesheets";
  if (sourceModule === "shiftboard") return "/shiftboard";
  if (sourceModule === "inventory") return "/inventory/equipment";
  if (sourceModule === "maintenance") return "/maintenance/history";
  if (sourceModule === "payroll") return "/payroll/adjustments";
  if (sourceModule === "quotation") return "/quotation/list";
  if (sourceModule === "finance") return "/payments";
  if (sourceModule === "policies") return "/policies/policies";
  if (sourceModule === "settings") return "/settings/team";
  return "/expenses";
}
