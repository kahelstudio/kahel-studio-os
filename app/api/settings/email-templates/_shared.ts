import { hasTrustedOrigin } from "@/lib/server/customer-auth";
import { getStaffPrincipal, type StaffPrincipal } from "@/lib/server/staff-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import type { Json } from "@/lib/server/supabase-database";

export async function authorizeTemplateMutation(request: Request) {
  const principal = await getStaffPrincipal(request);
  if (!principal) return { response: Response.json({ error: "Authentication required." }, { status: 401 }) };
  if (!hasTrustedOrigin(request)) return { response: Response.json({ error: "Request origin is not trusted." }, { status: 403 }) };
  if (!["admin", "super_admin"].includes(principal.role)) return { response: Response.json({ error: "Administrator access is required." }, { status: 403 }) };
  return { principal };
}

export function uuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
export function string(value: unknown, maximum: number) { return typeof value === "string" ? value.trim().slice(0, maximum) : ""; }

export async function auditTemplate(principal: StaffPrincipal, event: string, entityId: string, metadata?: Json) {
  const result = await getSupabaseAdmin().from("staff_audit_log").insert({ actor_id: principal.userId, actor_name: principal.email, event, event_type: "system", entity_type: "email_template", entity_id: entityId, metadata });
  if (result.error) console.error("[email-templates] Audit write failed", { event, entityId, code: result.error.code });
}
