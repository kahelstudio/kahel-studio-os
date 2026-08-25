import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { authorizeExpense, centavos, cleanText, expenseError, ExpenseApiError, readExpenseJson, UUID, uuid } from "../../_shared";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ expenseId: string }> }) {
  const auth = await authorizeExpense(request, true);
  if ("response" in auth) return auth.response;
  try {
    if (auth.principal.role === "staff") throw new ExpenseApiError("Owner repayment permission is required.", 403);
    const { expenseId } = await context.params;
    if (!UUID.test(expenseId)) throw new ExpenseApiError("Expense not found.", 404);
    const body = await readExpenseJson(request);
    const advance = await getSupabaseAdmin().from("owner_advances").select("id").eq("expense_id", expenseId).maybeSingle();
    if (advance.error) throw advance.error;
    if (!advance.data) throw new ExpenseApiError("Owner advance not found.", 404);
    const paidAt = cleanText(body.paidAt, "Repayment date", 40, true);
    if (Number.isNaN(new Date(paidAt).getTime())) throw new ExpenseApiError("Repayment date is invalid.");
    const result = await getSupabaseAdmin().rpc("owner_advance_record_repayment", {
      requested_owner_advance_id: advance.data.id, requested_actor_id: auth.principal.userId!, requested_payment_source_id: uuid(body.paymentSourceId, "Payment account", true)!,
      requested_amount_centavos: centavos(body.amount, "Repayment amount"), requested_transaction_reference: cleanText(body.transactionReference, "Transaction reference", 120, true),
      requested_paid_at: new Date(paidAt).toISOString(), requested_idempotency_key: uuid(body.idempotencyKey, "Repayment key", true)!,
    });
    if (result.error) throw result.error;
    return NextResponse.json({ advance: result.data });
  } catch (error) { return expenseError(error); }
}
