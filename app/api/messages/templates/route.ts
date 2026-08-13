import { getStaffPrincipal } from "@/lib/server/staff-auth";
import { canAccessMessages } from "@/lib/messages";
import { getEmailTemplates } from "@/lib/server/messages-data";

export async function GET(request: Request) {
  const principal = await getStaffPrincipal(request);
  if (!principal) return Response.json({ error: "Authentication required." }, { status: 401 });
  if (!canAccessMessages(principal)) return Response.json({ error: "Message template permission is required." }, { status: 403 });
  return Response.json(await getEmailTemplates(), { headers: { "Cache-Control": "private, no-store" } });
}
