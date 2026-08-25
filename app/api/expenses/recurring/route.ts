import { NextResponse } from "next/server";
import type { Json } from "@/lib/server/supabase-database";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { authorizeExpense, centavos, cleanText, expenseError, ExpenseApiError, readExpenseJson, uuid } from "../_shared";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await authorizeExpense(request, true);
  if ("response" in auth) return auth.response;
  try {
    if (auth.principal.role === "staff") throw new ExpenseApiError("Recurring expense permission is required.", 403);
    const body = await readExpenseJson(request);
    const action = cleanText(body.action, "Action", 20, true);
    if (action === "generate") {
      const result = await getSupabaseAdmin().rpc("recurring_expense_generate", { requested_template_id: uuid(body.templateId, "Template", true)!, requested_actor_id: auth.principal.userId! });
      if (result.error) throw result.error;
      return NextResponse.json({ expense: result.data }, { status: 201 });
    }
    if (action !== "create") throw new ExpenseApiError("Choose a valid recurring action.");
    const frequency = cleanText(body.frequency, "Frequency", 20, true);
    if (!["weekly", "monthly", "quarterly", "yearly"].includes(frequency)) throw new ExpenseApiError("Choose a valid frequency.");
    const startDate = cleanText(body.startDate, "Start date", 10, true);
    const nextDueDate = cleanText(body.nextDueDate, "Next due date", 10, true);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(nextDueDate)) throw new ExpenseApiError("Recurring dates are invalid.");
    const projectId = uuid(body.projectId, "Project");
    const result = await getSupabaseAdmin().rpc("recurring_expense_create", {
      requested_actor_id: auth.principal.userId!, requested_vendor: cleanText(body.vendor, "Vendor", 255, true), requested_category_id: uuid(body.categoryId, "Category", true)!,
      requested_expected_amount_centavos: centavos(body.amount, "Expected amount"), requested_frequency: frequency, requested_next_due_date: nextDueDate,
      requested_payment_source_id: uuid(body.paymentSourceId, "Payment account"), requested_default_allocation: [{ allocationType: projectId ? "project" : "studio_overhead", projectId, amountPercent: 100 }] as Json,
      requested_receipt_required: body.receiptRequired !== false, requested_start_date: startDate, requested_end_date: cleanText(body.endDate, "End date", 10) || null, requested_reminder_days: Number(body.reminderDays ?? 3),
    });
    if (result.error) throw result.error;
    return NextResponse.json({ template: result.data }, { status: 201 });
  } catch (error) { return expenseError(error); }
}
