import { getAuditLog } from "@/lib/server/audit-log-data";
import { getStaffPrincipal } from "@/lib/server/staff-auth";

export const runtime = "nodejs";

const csvCell = (value: string) => `"${(/^[=+\-@]/.test(value) ? `'${value}` : value).replaceAll('"', '""')}"`;

export async function GET(request: Request) {
  const principal = await getStaffPrincipal(request);
  if (!principal) return Response.json({ error: "Authentication required." }, { status: 401 });
  if (principal.role === "staff") return Response.json({ error: "Admin access is required to export logs." }, { status: 403 });

  const entries = await getAuditLog();
  const csv = [
    ["Event", "Actor", "Type", "Entity type", "Entity ID", "IP address", "When"],
    ...entries.map((entry) => [entry.event, entry.actorName, entry.eventType, entry.entityType ?? "", entry.entityId ?? "", entry.ipAddress ?? "", entry.createdAt]),
  ].map((row) => row.map(csvCell).join(",")).join("\r\n");

  return new Response(`\uFEFF${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="kahel-logs-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
