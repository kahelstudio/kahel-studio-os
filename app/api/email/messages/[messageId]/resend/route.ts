import { hasTrustedOrigin } from "@/lib/server/customer-auth";
import { getStaffPrincipal } from "@/lib/server/staff-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { processTransactionalEmailQueue } from "@/lib/server/transactional-email-service";

export const runtime = "nodejs";
type Context = { params: Promise<{ messageId: string }> };

export async function POST(request: Request, { params }: Context) {
  const principal = await getStaffPrincipal(request);
  if (!principal || !hasTrustedOrigin(request) || !["admin", "super_admin"].includes(principal.role)) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const { messageId } = await params;
  const idempotencyKey = request.headers.get("idempotency-key")?.trim();
  let body: { reason?: unknown };
  try { body = await request.json() as typeof body; } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!/^[0-9a-f-]{36}$/i.test(messageId) || !idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 100 || reason.length < 5 || reason.length > 180) return Response.json({ error: "Message, idempotency key, and a meaningful reason are required." }, { status: 400 });
  const admin = getSupabaseAdmin();
  const sourceReference = `manual-resend: ${reason} [${idempotencyKey}]`.slice(0, 250);
  const original = await admin.from("transactional_messages" as never).select("contains_secure_content,status,retry_eligible").eq("id", messageId).maybeSingle<{ contains_secure_content: boolean; status: string; retry_eligible: boolean }>();
  if (original.error) return Response.json({ error: "Unable to verify resend eligibility." }, { status: 503 });
  if (!original.data) return Response.json({ error: "Message was not found." }, { status: 404 });
  if (original.data.contains_secure_content) return Response.json({ error: "Security emails cannot be resent from stored history." }, { status: 409 });
  if (original.data.status !== "failed" || !original.data.retry_eligible) return Response.json({ error: "Only safe transient failures can be resent." }, { status: 409 });
  const prior = await admin.from("transactional_messages" as never).select("id,status").eq("parent_message_id", messageId).eq("source_reference", sourceReference).maybeSingle<{ id: string; status: string }>();
  if (prior.error) return Response.json({ error: "Unable to verify resend eligibility." }, { status: 503 });
  if (prior.data) return Response.json({ messageId: prior.data.id, status: prior.data.status, reused: true });
  const rpc = admin.rpc as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: { id: string; status: string } | null; error: { message?: string } | null }>;
  const result = await rpc("transactional_email_prepare_manual_resend", { requested_message_id: messageId, requested_reason: `${reason} [${idempotencyKey}]` });
  if (result.error || !result.data) return Response.json({ error: result.error?.message ?? "Message is not eligible for manual resend." }, { status: 409 });
  const audit = await admin.from("staff_audit_log").insert({ actor_id: principal.userId, actor_name: principal.email, event: "Transactional email manually requeued", event_type: "system", entity_type: "transactional_message", entity_id: result.data.id, metadata: { parent_message_id: messageId, reason, idempotency_key: idempotencyKey } });
  if (audit.error) console.error("[transactional-email] Manual resend audit failed", result.data.id, audit.error.code);
  const processed = await processTransactionalEmailQueue({ limit: 1, messageId: result.data.id, workerId: `staff:${principal.userId ?? principal.email}` });
  return Response.json({ messageId: result.data.id, status: processed.accepted ? "provider_accepted" : "failed", reused: false }, { status: processed.accepted ? 200 : 202 });
}
