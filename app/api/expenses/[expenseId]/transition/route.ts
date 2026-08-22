import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { authorizeExpense, cleanText, expenseError, ExpenseApiError, readExpenseJson, UUID } from "../../_shared";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ expenseId: string }> }) {
  const auth = await authorizeExpense(request, true);
  if ("response" in auth) return auth.response;
  try {
    const { expenseId } = await context.params;
    if (!UUID.test(expenseId)) throw new ExpenseApiError("Expense not found.", 404);
    const body = await readExpenseJson(request);
    const action = cleanText(body.action, "Action", 30, true);
    if (!["submit", "approve", "request_changes", "reject", "void"].includes(action)) throw new ExpenseApiError("Choose a valid expense action.");
    const expectedVersion = Number(body.expectedVersion);
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) throw new ExpenseApiError("Expense version is invalid.");
    const result = await getSupabaseAdmin().rpc("expense_transition", { requested_expense_id: expenseId, requested_actor_id: auth.principal.userId!, requested_expected_version: expectedVersion, requested_action: action, requested_reason: cleanText(body.reason, "Reason", 2000) || null });
    if (result.error) throw result.error;
    return NextResponse.json({ expense: result.data });
  } catch (error) { return expenseError(error); }
}
