import { authorizeApproval, approvalError } from "../_shared";
import { getApprovalDashboard } from "@/lib/server/approvals-data";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await authorizeApproval(request);
  if ("response" in auth) return auth.response;
  try {
    if (auth.principal.role === "staff") return Response.json({ error: "Admin access is required to export approval records." }, { status: 403 });
    const dashboard = await getApprovalDashboard(auth.principal);
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const requestType = url.searchParams.get("type");
    const priority = url.searchParams.get("priority");
    const query = url.searchParams.get("q")?.trim().toLowerCase();
    const rows = dashboard.records.filter((record) => (!status || record.status === status) && (!requestType || record.requestType === requestType) && (!priority || record.priority === priority) && (!query || `${record.reference} ${record.subject} ${record.requester}`.toLowerCase().includes(query)));
    const csv = [
      ["Reference", "Request type", "Subject", "Requester", "Source module", "Amount", "Currency", "Approver", "Submitted", "Required by", "Priority", "Status", "Fulfillment status"],
      ...rows.map((record) => [record.reference, record.requestTypeLabel, record.subject, record.requester, record.sourceModule, record.canViewFinancials && record.amount !== null ? (record.amount / 100).toFixed(2) : "Restricted", record.currency, record.currentApprover, record.submittedAt ?? "", record.requiredBy ?? "", record.priority, record.status, record.fulfillmentStatus ?? ""]),
    ].map((row) => row.map(csvCell).join(",")).join("\r\n");
    return new Response(`\uFEFF${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="kahel-approvals-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "private, no-store" } });
  } catch (error) {
    return approvalError(error);
  }
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}
