import { NextResponse } from "next/server";
import type { Json } from "@/lib/server/supabase-database";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { authorizeExpense, centavos, cleanText, expenseError, ExpenseApiError, readExpenseJson, UUID, uuid } from "../_shared";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ expenseId: string }> }) {
  const auth = await authorizeExpense(request, true);
  if ("response" in auth) return auth.response;
  try {
    const { expenseId } = await context.params;
    if (!UUID.test(expenseId)) throw new ExpenseApiError("Expense not found.", 404);
    const body = await readExpenseJson(request);
    const expectedVersion = Number(body.expectedVersion);
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) throw new ExpenseApiError("Expense version is invalid.");
    const subtotal = centavos(body.amount, "Amount");
    const tax = body.taxAmount === "" || body.taxAmount === null || body.taxAmount === undefined ? 0 : centavos(body.taxAmount, "Tax amount");
    if (!Array.isArray(body.allocations) || !body.allocations.length) throw new ExpenseApiError("At least one allocation is required.");
    const allocations = body.allocations.map((raw) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new ExpenseApiError("Allocation details are invalid.");
      const item = raw as Record<string, unknown>;
      return { allocationType: cleanText(item.allocationType, "Allocation", 40, true), projectId: uuid(item.projectId, "Project"), equipmentId: uuid(item.equipmentId, "Equipment"), maintenanceRecordId: uuid(item.maintenanceRecordId, "Maintenance record"), amountCentavos: centavos(item.amount, "Allocation amount") };
    });
    if (allocations.reduce((sum, item) => sum + item.amountCentavos, 0) !== subtotal + tax) throw new ExpenseApiError("Allocations must equal the expense total.");
    const date = cleanText(body.transactionDate, "Transaction date", 10, true);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ExpenseApiError("Transaction date is invalid.");
    const result = await getSupabaseAdmin().rpc("expense_update_draft", { requested_expense_id: expenseId, requested_actor_id: auth.principal.userId!, requested_expected_version: expectedVersion, requested_vendor: cleanText(body.vendor, "Vendor", 255, true), requested_category_id: uuid(body.categoryId, "Category", true)!, requested_description: cleanText(body.description, "Description", 1000, true), requested_date: date, requested_subtotal_centavos: subtotal, requested_tax_centavos: tax, requested_receipt_status: cleanText(body.receiptStatus, "Receipt status", 30, true), requested_receipt_exception: cleanText(body.receiptException, "Missing receipt explanation", 1000), requested_internal_note: cleanText(body.internalNote, "Internal note", 2000), requested_allocations: allocations as Json, requested_submit: body.submit === true });
    if (result.error) throw result.error;
    return NextResponse.json({ expense: result.data });
  } catch (error) { return expenseError(error); }
}
