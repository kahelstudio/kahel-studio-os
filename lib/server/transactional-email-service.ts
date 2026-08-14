import "server-only";

import { ResendEmailError, sendResendEmail, type TransactionalEmail } from "@/lib/resend-email";
import { TRANSACTIONAL_EMAILS } from "@/lib/transactional-emails";
import { getSupabaseAdmin } from "./supabase-admin";

type Environment = "development" | "staging" | "production";
type Source = "system" | "schedule" | "staff" | "webhook";
type RelatedIds = Partial<Record<"clientId" | "recipientProfileId" | "recipientUserId" | "bookingId" | "invoiceId" | "paymentId" | "projectId" | "galleryId" | "loyaltyRewardId" | "relatedId", string>> & { relatedType?: string };
type RenderedEmail = Pick<TransactionalEmail, "to" | "from" | "replyTo" | "subject" | "html" | "text">;

export type EnqueueEmailInput = RelatedIds & {
  templateKey: string;
  logicalIdempotencyKey: string;
  triggerKey: string;
  source?: Source;
  sourceReference?: string;
  recipientName?: string;
  recipientSnapshot?: Record<string, unknown>;
  renderContext?: Record<string, unknown>;
  message: RenderedEmail;
  secure?: boolean;
  maxAttempts?: number;
};

type MessageRow = {
  id: string; claim_token: string; recipient_email: string; sender_email: string; sender_name: string | null;
  reply_to_email: string | null; rendered_subject: string; rendered_html: string | null; rendered_text: string | null;
  logical_idempotency_key: string; contains_secure_content: boolean; status: string;
};

const EXTRA_TEMPLATES: Record<string, { name: string; subject: string; secure?: boolean }> = {
  "payment-receipt": { name: "Payment receipt", subject: "Kahel Studio payment receipt" },
  "loyalty-reward-earned": { name: "Loyalty reward earned", subject: "You earned a complimentary Solo Session" },
  "gallery-ready": { name: "Gallery ready", subject: "Your Kahel Studio gallery is ready" },
  "security-recovery-code": { name: "Recovery email verification", subject: "Verify your Kahel Studio recovery email", secure: true },
  "security-password-reset": { name: "Password reset", subject: "Reset your Kahel Studio password", secure: true },
  "supabase-auth-invitation": { name: "Customer account invitation", subject: "Customer account invitation", secure: true },
  "supabase-auth-password-setup": { name: "Customer password setup", subject: "Customer password setup", secure: true },
  "supabase-auth-password-reset": { name: "Password reset request", subject: "Password reset request", secure: true },
  "delivery-test": { name: "Transactional email delivery test", subject: "Kahel Studio transactional email test" },
};

function environment(): Environment {
  const value = process.env.APP_ENV as string | undefined;
  return value === "production" || value === "staging" ? value : "development";
}

function address(value: string) {
  const match = value.trim().match(/^(.*?)\s*<([^<>]+)>$/);
  return { email: (match?.[2] ?? value).trim().toLowerCase(), name: match?.[1]?.trim().replace(/^"|"$/g, "") || null };
}

function definition(templateKey: string) {
  const catalogue = TRANSACTIONAL_EMAILS.find((item) => item.id === templateKey);
  if (catalogue) return { name: catalogue.name, subject: catalogue.subject, secure: false, fields: catalogue.fields };
  const extra = EXTRA_TEMPLATES[templateKey];
  if (!extra) throw new Error(`Transactional email template is not approved: ${templateKey}`);
  return { ...extra, secure: Boolean(extra.secure), fields: [] as string[] };
}

async function ensureTemplateVersion(templateKey: string) {
  const admin = getSupabaseAdmin();
  const approved = definition(templateKey);
  let template = await admin.from("email_templates" as never).select("id").eq("template_key", templateKey).maybeSingle<{ id: string }>();
  if (template.error) throw template.error;
  if (!template.data) {
    const inserted = await admin.from("email_templates" as never).upsert({ template_key: templateKey, name: approved.name, audience: "customer", description: "Managed by the approved application renderer.", active: true } as never, { onConflict: "template_key" }).select("id").single<{ id: string }>();
    if (inserted.error) throw inserted.error;
    template = inserted;
  }
  const existing = await admin.from("email_template_versions" as never).select("id").eq("template_id", template.data!.id).eq("version", 1).maybeSingle<{ id: string }>();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data.id;
  const publishedAt = new Date().toISOString();
  const inserted = await admin.from("email_template_versions" as never).insert({
    template_id: template.data!.id, version: 1, subject_template: approved.subject,
    html_template: approved.secure ? "[secure content unavailable]" : "[rendered by approved application renderer]",
    text_template: approved.secure ? "[secure content unavailable]" : "[rendered by approved application renderer]",
    variable_schema: { fields: approved.fields }, contains_secure_content: approved.secure,
    change_note: "Initial approved application renderer contract.", created_at: publishedAt, published_at: publishedAt,
  } as never).select("id").single<{ id: string }>();
  if (inserted.error) {
    const concurrent = await admin.from("email_template_versions" as never).select("id").eq("template_id", template.data!.id).eq("version", 1).single<{ id: string }>();
    if (concurrent.error) throw inserted.error;
    return concurrent.data.id;
  }
  return inserted.data.id;
}

async function enqueueTransactionalEmailWithProvider(input: EnqueueEmailInput, provider: "resend" | "supabase_auth", externallyAccepted = false) {
  const templateVersionId = await ensureTemplateVersion(input.templateKey);
  const sender = address(input.message.from);
  const recipient = address(Array.isArray(input.message.to) ? input.message.to[0] : input.message.to);
  const secure = Boolean(input.secure || definition(input.templateKey).secure);
  const redacted = "[secure content unavailable]";
  const admin = getSupabaseAdmin();
  const rpc = admin.rpc.bind(admin) as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: MessageRow | null; error: { message?: string } | null }>;
  const { data, error } = await rpc("transactional_email_enqueue", { requested: {
    template_version_id: templateVersionId, environment: environment(), provider,
    logical_idempotency_key: input.logicalIdempotencyKey, client_id: input.clientId,
    recipient_profile_id: input.recipientProfileId, recipient_user_id: input.recipientUserId,
    recipient_email: recipient.email, recipient_name: input.recipientName ?? recipient.name,
    recipient_snapshot: secure ? { preview: "unavailable" } : (input.recipientSnapshot ?? { name: input.recipientName ?? recipient.name }),
    sender_email: sender.email, sender_name: sender.name, reply_to_email: input.message.replyTo ? address(input.message.replyTo).email : undefined,
    trigger_key: input.triggerKey, source: input.source ?? "system", source_reference: input.sourceReference,
    booking_id: input.bookingId, invoice_id: input.invoiceId, payment_id: input.paymentId, project_id: input.projectId,
    gallery_id: input.galleryId, loyalty_reward_id: input.loyaltyRewardId, related_type: input.relatedType, related_id: input.relatedId,
    render_context: secure ? {} : (input.renderContext ?? {}), rendered_subject: input.message.subject,
    rendered_html: secure ? redacted : input.message.html, rendered_text: secure ? redacted : input.message.text,
    contains_secure_content: secure, content_redacted: secure, render_context_redacted: secure,
    redacted_fields: secure ? ["render_context", "rendered_html", "rendered_text"] : [], max_attempts: secure ? 1 : (input.maxAttempts ?? 5),
    next_attempt_at: secure ? "1970-01-01T00:00:00.000Z" : undefined,
    initial_status: externallyAccepted ? "provider_accepted" : undefined,
  } });
  if (error || !data) throw new Error(error?.message ?? "Unable to enqueue transactional email.");
  return data;
}

export async function enqueueTransactionalEmail(input: EnqueueEmailInput) {
  return enqueueTransactionalEmailWithProvider(input, "resend");
}

export async function recordSupabaseAuthEmailRequest(input: {
  templateKey: "supabase-auth-invitation" | "supabase-auth-password-setup" | "supabase-auth-password-reset";
  operationId: string;
  to: string;
  recipientUserId?: string;
  recipientProfileId?: string;
  clientId?: string;
  sourceReference?: string;
}) {
  const definition = EXTRA_TEMPLATES[input.templateKey];
  const from = process.env.SUPABASE_AUTH_EMAIL_FROM ?? process.env.BOOKING_EMAIL_FROM ?? "auth@kahelstudio.com";
  try {
    await enqueueTransactionalEmailWithProvider({
      templateKey: input.templateKey,
      logicalIdempotencyKey: `${input.templateKey}:${input.operationId}`,
      triggerKey: input.templateKey,
      sourceReference: input.sourceReference,
      recipientUserId: input.recipientUserId,
      recipientProfileId: input.recipientProfileId,
      clientId: input.clientId,
      secure: true,
      maxAttempts: 1,
      message: { to: input.to, from, subject: definition.subject, html: "[secure content unavailable]", text: "[secure content unavailable]" },
    }, "supabase_auth", true);
    return true;
  } catch (error) {
    console.error("[transactional-email] Unable to record Supabase Auth email request", input.templateKey, classifyEmailError(error).code);
    return false;
  }
}

export function classifyEmailError(error: unknown) {
  if (error instanceof ResendEmailError) {
    const retryable = error.status === 408 || error.status === 409 || error.status === 429 || error.status >= 500;
    return { code: (error.code ?? `http_${error.status}`).slice(0, 120), message: `Resend request failed (${error.status}).`, retryable };
  }
  return { code: "provider_unavailable", message: "Email provider request failed.", retryable: true };
}

export async function processTransactionalEmailQueue(options: { limit?: number; workerId?: string; messageId?: string; secureOverride?: { messageId: string; message: RenderedEmail } } = {}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Resend email is not configured.");
  const limit = Math.min(Math.max(options.limit ?? 10, 1), 50);
  const workerId = options.workerId ?? `app:${crypto.randomUUID()}`;
  const admin = getSupabaseAdmin();
  const rpc = admin.rpc.bind(admin) as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: MessageRow | null; error: { message?: string } | null }>;
  let processed = 0;
  let accepted = 0;
  for (; processed < limit; processed += 1) {
    const claim = await rpc("transactional_email_claim_api", { requested: { worker_id: workerId, environment: environment(), provider: "resend", lease: "5 minutes", message_id: options.messageId ?? null } });
    if (claim.error) throw new Error(claim.error.message ?? "Unable to claim transactional email.");
    if (!claim.data?.id) break;
    const row = claim.data;
    const override = options.secureOverride?.messageId === row.id ? options.secureOverride.message : null;
    try {
      if (row.contains_secure_content && !override) throw new ResendEmailError("Secure content is no longer available.", 422, "secure_content_unavailable");
      const message = override ?? {
        to: row.recipient_email,
        from: row.sender_name ? `${row.sender_name} <${row.sender_email}>` : row.sender_email,
        replyTo: row.reply_to_email ?? undefined, subject: row.rendered_subject,
        html: row.rendered_html ?? "", text: row.rendered_text ?? "",
      };
      const providerId = await sendResendEmail(apiKey, { ...message, idempotencyKey: `${environment()}:${row.id}` });
      const finish = await rpc("transactional_email_finish_api", { requested: { message_id: row.id, claim_token: row.claim_token, outcome: "provider_accepted", provider_message_id: providerId, response_metadata: { provider: "resend" }, response_metadata_redacted: true } });
      if (finish.error) throw new Error(finish.error.message ?? "Unable to finish transactional email.");
      accepted += 1;
    } catch (error) {
      const safe = classifyEmailError(error);
      console.error("[transactional-email] Provider attempt failed", row.id, safe.code, error);
      const finish = await rpc("transactional_email_finish_api", { requested: { message_id: row.id, claim_token: row.claim_token, outcome: "failed", error_code: safe.code, error_message: safe.message, retryable: row.contains_secure_content ? false : safe.retryable, response_metadata: {}, response_metadata_redacted: true } });
      if (finish.error) console.error("[transactional-email] Unable to record provider failure", row.id, finish.error.message);
    }
  }
  return { processed, accepted, failed: processed - accepted };
}

export async function sendTransactionalEmail(input: EnqueueEmailInput) {
  try {
    const queued = await enqueueTransactionalEmail(input);
    if (["provider_accepted", "sent", "delivered"].includes(queued.status)) return true;
    await processTransactionalEmailQueue({ limit: 1, messageId: queued.id, secureOverride: input.secure ? { messageId: queued.id, message: input.message } : undefined });
    const current = await getSupabaseAdmin().from("transactional_messages" as never).select("status").eq("id", queued.id).single<{ status: string }>();
    return !current.error && ["provider_accepted", "sent", "delivered"].includes(current.data.status);
  } catch (error) {
    console.error("[transactional-email] Delivery deferred", input.templateKey, classifyEmailError(error).code, error);
    return false;
  }
}

export async function recordResendProviderEvent(input: { eventId: string; type: string; providerMessageId: string; occurredAt: string }) {
  const mapped: Record<string, string> = { "email.sent": "sent", "email.delivery_delayed": "deferred", "email.delivered": "delivered", "email.failed": "failed", "email.bounced": "bounced", "email.complained": "complained", "email.suppressed": "suppressed" };
  const status = mapped[input.type];
  if (!status) return null;
  const admin = getSupabaseAdmin();
  const rpc = admin.rpc.bind(admin) as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: MessageRow | null; error: { code?: string; message?: string } | null }>;
  const result = await rpc("transactional_email_record_provider_event", { requested_environment: environment(), requested_provider: "resend", requested_provider_event_id: input.eventId, requested_event_type: input.type, requested_mapped_status: status, requested_occurred_at: input.occurredAt, requested_provider_message_id: input.providerMessageId, requested_payload: { type: input.type, provider_message_id: input.providerMessageId }, requested_payload_redacted: true });
  if (result.error?.code === "P0002") return null;
  if (result.error) throw new Error(result.error.message ?? "Unable to record email event.");
  return result.data;
}
