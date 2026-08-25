import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { authorizeExpense, cleanText, expenseError, ExpenseApiError, readExpenseJson, UUID, uuid } from "../../_shared";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ expenseId: string }> }) {
  const auth = await authorizeExpense(request, true);
  if ("response" in auth) return auth.response;
  try {
    if (auth.principal.role === "staff") throw new ExpenseApiError("Expense review permission is required.", 403);
    const { expenseId } = await context.params;
    if (!UUID.test(expenseId)) throw new ExpenseApiError("Expense not found.", 404);
    const body = await readExpenseJson(request);
    const action = cleanText(body.action, "Action", 20, true);
    const expectedVersion = Number(body.expectedVersion);
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) throw new ExpenseApiError("Expense version is invalid.");
    const result = await getSupabaseAdmin().rpc("expense_resolve_duplicate", { requested_expense_id: expenseId, requested_actor_id: auth.principal.userId!, requested_expected_version: expectedVersion, requested_action: action, requested_duplicate_of: uuid(body.duplicateOf, "Canonical expense"), requested_reason: cleanText(body.reason, "Reason", 2000, true) });
    if (result.error) throw result.error;
    return NextResponse.json({ expense: result.data });
  } catch (error) { return expenseError(error); }
}
