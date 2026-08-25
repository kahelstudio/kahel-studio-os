import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { authorizeExpense, cleanText, expenseError, ExpenseApiError, readExpenseJson, UUID, uuid } from "../../_shared";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ expenseId: string }> }) {
  const auth = await authorizeExpense(request, true);
  if ("response" in auth) return auth.response;
  try {
    if (auth.principal.role === "staff") throw new ExpenseApiError("Financial recording permission is required.", 403);
    const { expenseId } = await context.params;
    if (!UUID.test(expenseId)) throw new ExpenseApiError("Expense not found.", 404);
    const body = await readExpenseJson(request);
    const action = cleanText(body.action, "Action", 20, true);
    const expectedVersion = Number(body.expectedVersion);
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) throw new ExpenseApiError("Expense version is invalid.");
    if (action === "schedule") {
      const result = await getSupabaseAdmin().rpc("expense_schedule_reimbursement", { requested_expense_id: expenseId, requested_actor_id: auth.principal.userId!, requested_expected_version: expectedVersion });
      if (result.error) throw result.error;
      return NextResponse.json({ expense: result.data });
    }
    if (action !== "pay") throw new ExpenseApiError("Choose a valid reimbursement action.");
    const paidAt = cleanText(body.paidAt, "Payment date", 40, true);
    if (Number.isNaN(new Date(paidAt).getTime())) throw new ExpenseApiError("Payment date is invalid.");
    const result = await getSupabaseAdmin().rpc("expense_record_reimbursement_payment", {
      requested_expense_id: expenseId, requested_actor_id: auth.principal.userId!, requested_expected_version: expectedVersion,
      requested_payment_source_id: uuid(body.paymentSourceId, "Payment account", true)!, requested_transaction_reference: cleanText(body.transactionReference, "Transaction reference", 120, true),
      requested_paid_at: new Date(paidAt).toISOString(), requested_idempotency_key: uuid(body.idempotencyKey, "Payment key", true)!,
    });
    if (result.error) throw result.error;
    return NextResponse.json({ expense: result.data });
  } catch (error) { return expenseError(error); }
}
