import { hasTrustedOrigin } from "@/lib/server/customer-auth";
import { getStaffPrincipal } from "@/lib/server/staff-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const principal = await getStaffPrincipal(request);
  if (!principal) return Response.json({ error: "Authentication required." }, { status: 401 });
  if (!principal.userId) return Response.json({ notifications: [], unread: 0 });
  const admin = getSupabaseAdmin();
  const [result, unreadResult] = await Promise.all([
    admin.from("staff_notifications").select("id,title,body,href,read_at,created_at").eq("recipient_id", principal.userId).order("created_at", { ascending: false }).limit(50),
    admin.from("staff_notifications").select("id", { count: "exact", head: true }).eq("recipient_id", principal.userId).is("read_at", null),
  ]);
  if (result.error || unreadResult.error) return Response.json({ error: "Unable to load notifications." }, { status: 500 });
  return Response.json({ notifications: result.data ?? [], unread: unreadResult.count ?? 0 }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request) {
  if (!hasTrustedOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const principal = await getStaffPrincipal(request);
  if (!principal?.userId) return Response.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: unknown; all?: unknown } | null;
  let query = getSupabaseAdmin().from("staff_notifications").update({ read_at: new Date().toISOString() }).eq("recipient_id", principal.userId).is("read_at", null);
  if (body?.all !== true) {
    if (typeof body?.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id)) return Response.json({ error: "Invalid notification." }, { status: 400 });
    query = query.eq("id", body.id);
  }
  const result = await query;
  if (result.error) return Response.json({ error: "Unable to update notifications." }, { status: 500 });
  return Response.json({ ok: true });
}
