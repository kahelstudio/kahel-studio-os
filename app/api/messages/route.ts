import { getStaffPrincipal } from "@/lib/server/staff-auth";
import { canAccessMessages, parseMessageFilters } from "@/lib/messages";
import { getMessages } from "@/lib/server/messages-data";

export async function GET(request: Request) {
  const principal = await getStaffPrincipal(request);
  if (!principal) return Response.json({ error: "Authentication required." }, { status: 401 });
  if (!canAccessMessages(principal)) return Response.json({ error: "Message history permission is required." }, { status: 403 });
  const url = new URL(request.url);
  const filters = parseMessageFilters(Object.fromEntries(url.searchParams));
  return Response.json(await getMessages(principal, filters), { headers: { "Cache-Control": "private, no-store" } });
}
