import { authorizeExpense, expenseError } from "../_shared";
import { getExpenseWorkspace } from "@/lib/server/expenses-data";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await authorizeExpense(request);
  if ("response" in auth) return auth.response;
  try {
    if (auth.principal.role === "staff") return Response.json({ error: "Expense export is restricted." }, { status: 403 });
    const data = await getExpenseWorkspace(auth.principal);
    const header = ["Reference", "Transaction date", "Vendor", "Category", "Description", "Project", "Net amount", "Tax", "Total", "Payment method", "Payment account", "Approval status", "Receipt state", "Submitter", "Reviewer"];
    const rows = data.rows.map((row) => [row.reference, row.transactionDate, row.vendor, row.category, row.description, row.projectReference ?? "Studio overhead", row.subtotal / 100, row.tax / 100, row.total / 100, row.paymentMethod ?? "", row.paymentSource ?? "", row.status, row.receiptStatus, row.submitter, row.reviewer ?? ""]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="kahel-expenses-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "private, no-store" } });
  } catch (error) { return expenseError(error); }
}

function csvCell(value: string | number) { return `"${String(value).replaceAll('"', '""')}"`; }
