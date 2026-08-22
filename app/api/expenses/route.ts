import { NextResponse } from "next/server";
import { getExpenseWorkspace } from "@/lib/server/expenses-data";
import type { Json } from "@/lib/server/supabase-database";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { authorizeExpense, centavos, cleanText, expenseError, ExpenseApiError, readExpenseJson, uuid } from "./_shared";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await authorizeExpense(request);
  if ("response" in auth) return auth.response;
  try { return NextResponse.json(await getExpenseWorkspace(auth.principal)); }
  catch (error) { return expenseError(error); }
}

export async function POST(request: Request) {
  const auth = await authorizeExpense(request, true);
  if ("response" in auth) return auth.response;
  try {
    const body = await readExpenseJson(request);
    if (auth.principal.role === "staff" && body.reimbursable !== true) throw new ExpenseApiError("Staff may submit personal reimbursement claims only.", 403);
    const idempotencyKey = uuid(body.idempotencyKey, "Submission key", true)!;
    const categoryId = uuid(body.categoryId, "Category", true)!;
    const paymentSourceId = uuid(body.paymentSourceId, "Payment source");
    const paidByUserId = uuid(body.paidByUserId, "Paid by");
    const transactionDate = cleanText(body.transactionDate, "Transaction date", 10, true);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(transactionDate)) throw new ExpenseApiError("Transaction date is invalid.");
    const subtotal = centavos(body.amount, "Amount");
    const tax = body.taxAmount === "" || body.taxAmount === null || body.taxAmount === undefined ? 0 : centavos(body.taxAmount, "Tax amount");
    const total = subtotal + tax;
    const rawAllocations = Array.isArray(body.allocations) ? body.allocations : [{ allocationType: body.allocationType, projectId: body.projectId, equipmentId: body.equipmentId, maintenanceRecordId: body.maintenanceRecordId, amount: body.amount }];
    if (!rawAllocations.length || rawAllocations.length > 20) throw new ExpenseApiError("Add between one and twenty allocations.");
    const allocations: Array<Record<string, string | number | null>> = [];
    const destinationKeys = new Set<string>();
    for (const raw of rawAllocations) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new ExpenseApiError("Allocation details are invalid.");
      const item = raw as Record<string, unknown>;
      const allocationType = cleanText(item.allocationType, "Allocation", 40, true);
      if (!["studio_overhead", "project", "booking", "inventory_asset", "maintenance"].includes(allocationType)) throw new ExpenseApiError("Choose a valid allocation.");
      const projectId = uuid(item.projectId, "Project"); const equipmentId = uuid(item.equipmentId, "Equipment"); const maintenanceRecordId = uuid(item.maintenanceRecordId, "Maintenance record");
      const amountCentavos = rawAllocations.length === 1 ? total : centavos(item.amount, "Allocation amount");
      const key = `${allocationType}:${projectId ?? equipmentId ?? maintenanceRecordId ?? "overhead"}`;
      if (destinationKeys.has(key)) throw new ExpenseApiError("Duplicate allocation destinations are not allowed.");
      destinationKeys.add(key);
      if (allocationType === "project") { const record = await getSupabaseAdmin().from("projects").select("id").eq("id", projectId ?? "").maybeSingle(); if (record.error) throw record.error; if (!record.data) throw new ExpenseApiError("The selected project is unavailable.", 409); }
      if (allocationType === "inventory_asset") { const record = await getSupabaseAdmin().from("equipment").select("id").eq("id", equipmentId ?? "").maybeSingle(); if (record.error) throw record.error; if (!record.data) throw new ExpenseApiError("The selected equipment is unavailable.", 409); }
      if (allocationType === "maintenance") { const record = await getSupabaseAdmin().from("maintenance_records").select("id").eq("id", maintenanceRecordId ?? "").maybeSingle(); if (record.error) throw record.error; if (!record.data) throw new ExpenseApiError("The selected maintenance record is unavailable.", 409); }
      allocations.push({ allocationType, projectId, equipmentId, maintenanceRecordId, amountCentavos });
    }
    if (allocations.reduce((sum, item) => sum + Number(item.amountCentavos), 0) !== total) throw new ExpenseApiError("Allocations must equal the expense total.");
    const receiptStatus = cleanText(body.receiptStatus, "Receipt status", 30) || "missing";
    if (!["missing", "attached", "under_review", "verified", "invalid", "not_required"].includes(receiptStatus)) throw new ExpenseApiError("Choose a valid receipt status.");
    const receiptException = cleanText(body.receiptException, "Missing receipt explanation", 1000);
    if (receiptStatus === "missing" && body.submit === true && !receiptException) throw new ExpenseApiError("Explain why the required receipt is unavailable.");
    const reimbursable = body.reimbursable === true;
    const ownerFunded = body.ownerFunded === true;
    if (reimbursable && ownerFunded) throw new ExpenseApiError("Owner advances and staff reimbursements are separate workflows.");
    if ((reimbursable || ownerFunded) && !paidByUserId) throw new ExpenseApiError("Choose the person who paid this expense.");
    if (auth.principal.role === "staff" && paidByUserId !== auth.principal.userId) throw new ExpenseApiError("You cannot submit a reimbursement for another staff member.", 403);
    const result = await getSupabaseAdmin().rpc("expense_create", {
      requested_actor_id: auth.principal.userId!, requested_idempotency_key: idempotencyKey,
      requested_vendor: cleanText(body.vendor, "Vendor", 255, true), requested_category_id: categoryId,
      requested_description: cleanText(body.description, "Description", 1000, true), requested_date: transactionDate,
      requested_subtotal_centavos: subtotal, requested_tax_centavos: tax, requested_payment_source_id: paymentSourceId,
      requested_paid_by_type: ownerFunded ? "owner" : reimbursable ? "staff" : "studio_account",
      requested_paid_by_user_id: paidByUserId, requested_receipt_status: receiptStatus,
      requested_receipt_exception: receiptException, requested_internal_note: cleanText(body.internalNote, "Internal note", 2000),
      requested_invoice_number: cleanText(body.invoiceNumber, "Invoice number", 120), requested_receipt_number: cleanText(body.receiptNumber, "Receipt number", 120),
      requested_allocations: allocations as Json,
      requested_submit: body.submit === true, requested_reimbursable: reimbursable, requested_owner_funded: ownerFunded,
      requested_approval_request_id: null,
    });
    if (result.error) throw result.error;
    return NextResponse.json({ expense: result.data }, { status: 201 });
  } catch (error) { return expenseError(error); }
}
