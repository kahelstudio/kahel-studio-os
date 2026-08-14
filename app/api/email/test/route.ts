import { hasTrustedOrigin } from "@/lib/server/customer-auth";
import { getStaffPrincipal } from "@/lib/server/staff-auth";
import { processTransactionalEmailQueue, sendTransactionalEmail } from "@/lib/server/transactional-email-service";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

const ALLOWED_RECIPIENTS = new Set(["hello@kahel.studio", "joanne.kahelstudio@gmail.com"]);

async function secretMatches(provided: string | null, expected: string | undefined) {
  if (!provided || !expected) return false;
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([crypto.subtle.digest("SHA-256", encoder.encode(provided)), crypto.subtle.digest("SHA-256", encoder.encode(expected))]);
  const a = new Uint8Array(left), b = new Uint8Array(right);
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

export async function POST(request: Request) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  const oneTimeOperator = await secretMatches(bearer, process.env.EMAIL_TEST_SECRET);
  const principal = oneTimeOperator ? null : await getStaffPrincipal(request);
  if (!oneTimeOperator && (!principal || principal.role !== "super_admin" || !hasTrustedOrigin(request))) return Response.json({ error: "Unauthorized." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request body." }, { status: 400 }); }
  const recipients = body && typeof body === "object" && !Array.isArray(body) && Array.isArray((body as { recipients?: unknown }).recipients) ? (body as { recipients: unknown[] }).recipients : [];
  const normalized = [...new Set(recipients.map((value) => typeof value === "string" ? value.trim().toLowerCase() : ""))];
  if (!normalized.length || normalized.length > 2 || normalized.some((recipient) => !ALLOWED_RECIPIENTS.has(recipient))) return Response.json({ error: "Choose only the approved test recipients." }, { status: 400 });
  const from = process.env.BOOKING_EMAIL_FROM;
  if (!from) return Response.json({ error: "Sender address is not configured." }, { status: 503 });
  const operationId = crypto.randomUUID();
  const recent = await getSupabaseAdmin().from("transactional_messages").select("id,recipient_email,status,last_error_code,attempt_count,next_attempt_at,created_at").eq("trigger_key", "operator.delivery_test").in("recipient_email", normalized).gte("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString()).order("created_at", { ascending: false });
  if (recent.error) return Response.json({ error: "Unable to check recent delivery tests." }, { status: 503 });
  const existing = new Map((recent.data ?? []).map((message) => [message.recipient_email, message]));
  const results: Array<{ recipient: string; accepted: boolean; skipped?: boolean; messageId?: string; status?: string; errorCode?: string; attemptCount?: number; nextAttemptAt?: string }> = [];
  for (const recipient of normalized) {
    const previous = existing.get(recipient);
    if (previous) {
      if (["queued", "failed"].includes(previous.status)) await processTransactionalEmailQueue({ limit: 1, messageId: previous.id });
      const current = await getSupabaseAdmin().from("transactional_messages").select("status,last_error_code,attempt_count,next_attempt_at").eq("id", previous.id).single();
      const status = current.data?.status ?? previous.status;
      results.push({ recipient, accepted: ["provider_accepted", "sent", "delivered"].includes(status), skipped: true, messageId: previous.id, status, errorCode: current.data?.last_error_code ?? previous.last_error_code ?? undefined, attemptCount: current.data?.attempt_count ?? previous.attempt_count, nextAttemptAt: current.data?.next_attempt_at ?? previous.next_attempt_at });
      continue;
    }
    const accepted = await sendTransactionalEmail({
      templateKey: "delivery-test",
      logicalIdempotencyKey: `delivery-test:${operationId}:${recipient}`,
      triggerKey: "operator.delivery_test",
      source: "staff",
      sourceReference: `Delivery test ${operationId}`,
      recipientName: recipient === "hello@kahel.studio" ? "Kahel Studio" : "Joanne",
      recipientSnapshot: { email: recipient, purpose: "transactional delivery test" },
      renderContext: { operationId },
      message: {
        to: recipient,
        from,
        replyTo: process.env.BOOKING_EMAIL_REPLY_TO,
        subject: "Kahel Studio transactional email test",
        html: `<main style="font-family:Arial,sans-serif;line-height:1.5"><h1>Transactional email test</h1><p>This confirms that Kahel Studio OS can send transactional email through its configured production delivery path.</p><p>Test reference: ${operationId}</p></main>`,
        text: `Transactional email test\n\nThis confirms that Kahel Studio OS can send transactional email through its configured production delivery path.\n\nTest reference: ${operationId}`,
      },
    });
    results.push({ recipient, accepted });
  }
  return Response.json({ operationId, results }, { status: results.every((result) => result.accepted) ? 200 : 502, headers: { "Cache-Control": "no-store" } });
}
