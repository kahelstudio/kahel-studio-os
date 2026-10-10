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

export class TransactionalEmailIssue extends Error {
  constructor(readonly code: string, readonly safeMessage: string, readonly retryable: boolean) {
    super(safeMessage);
    this.name = "TransactionalEmailIssue";
  }
}

const EXTRA_TEMPLATES: Record<string, { name: string; subject: string; secure?: boolean; audience?: "customer" | "internal" }> = {
  "payment-receipt": { name: "Payment receipt", subject: "Kahel Studio payment receipt" },
  "loyalty-reward-earned": { name: "Loyalty reward earned", subject: "You earned a complimentary Solo Session" },
  "gallery-ready": { name: "Gallery ready", subject: "Your Kahel Studio gallery is ready" },
  "security-recovery-code": { name: "Recovery email verification", subject: "Verify your Kahel Studio recovery email", secure: true },
  "security-password-reset": { name: "Password reset", subject: "Reset your Kahel Studio password", secure: true },
  "supabase-auth-invitation": { name: "Customer account invitation", subject: "Customer account invitation", secure: true },
  "supabase-auth-password-setup": { name: "Customer password setup", subject: "Customer password setup", secure: true },
  "supabase-auth-password-reset": { name: "Password reset request", subject: "Password reset request", secure: true },
  "delivery-test": { name: "Transactional email delivery test", subject: "Kahel Studio transactional email test", audience: "internal" },
};

function environment(): Environment {
  const value = process.env.APP_ENV as string | undefined;
  return value === "production" || value === "staging" ? value : "development";
}

function address(value: string, kind: "recipient" | "sender" | "reply-to" = "recipient") {
  const match = value.trim().match(/^(.*?)\s*<([^<>]+)>$/);
  const email = (match?.[2] ?? value).trim().toLowerCase();
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) {
    const label = kind === "reply-to" ? "reply-to address" : `${kind} email`;
    throw new TransactionalEmailIssue(`invalid_${kind.replace("-", "_")}`, `The ${label} is missing or invalid.`, false);
  }
  return { email, name: match?.[1]?.trim().replace(/^"|"$/g, "") || null };
}

function definition(templateKey: string) {
  const catalogue = TRANSACTIONAL_EMAILS.find((item) => item.id === templateKey);
  if (catalogue) return { name: catalogue.name, subject: catalogue.subject, secure: false, fields: catalogue.fields, audience: catalogue.audience === "Internal" ? "internal" as const : "customer" as const };
  const extra = EXTRA_TEMPLATES[templateKey];
  if (!extra) throw new TransactionalEmailIssue("no_active_template_version", "No active email template version is available.", false);
  return { ...extra, secure: Boolean(extra.secure), fields: [] as string[], audience: extra.audience ?? "customer" as const };
}

export function validateRenderedTransactionalEmail(templateKey: string, message: RenderedEmail) {
  const approved = definition(templateKey);
  const recipients = Array.isArray(message.to) ? message.to : [message.to];
  if (recipients.length !== 1) throw new TransactionalEmailIssue("invalid_recipient", "Transactional emails require exactly one valid recipient.", false);
  address(recipients[0], "recipient");
  address(message.from, "sender");
  if (message.replyTo) address(message.replyTo, "reply-to");
  if (!message.subject.trim() || (!message.html.trim() && !message.text.trim())) {
    throw new TransactionalEmailIssue("empty_email_content", "The email subject and content are required.", false);
  }
  const rendered = `${message.subject}\n${message.html}\n${message.text}`;
  const unresolved = [...rendered.matchAll(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g)].map((match) => match[1]);
  if (unresolved.length) {
    const unique = [...new Set(unresolved)];
    const unsupported = unique.filter((field) => !approved.fields.includes(field));
    const fields = unsupported.length ? unsupported : unique;
    throw new TransactionalEmailIssue(
      unsupported.length ? "unsupported_merge_field" : "missing_required_merge_field",
      `${unsupported.length ? "Unsupported" : "Missing required"} merge field${fields.length === 1 ? "" : "s"}: ${fields.join(", ")}.`,
      false,
    );
  }
  return approved;
}

export function renderTransactionalTemplate(
  templateKey: string,
  templates: { subject: string; html: string | null; text: string | null },
  context: Record<string, unknown>,
) {
  const approved = definition(templateKey);
  const source = `${templates.subject}\n${templates.html ?? ""}\n${templates.text ?? ""}`;
  const fields = [...new Set([...source.matchAll(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g)].map((match) => match[1]))];
  const unsupported = fields.filter((field) => !approved.fields.includes(field));
  if (unsupported.length) {
    throw new TransactionalEmailIssue("unsupported_merge_field", `Unsupported merge field${unsupported.length === 1 ? "" : "s"}: ${unsupported.join(", ")}.`, false);
  }
  const missing = fields.filter((field) => context[field] === undefined || context[field] === null || String(context[field]).trim() === "");
  if (missing.length) {
    throw new TransactionalEmailIssue("missing_required_merge_field", `Missing required merge field${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}.`, false);
  }
  const render = (value: string | null, html: boolean) => (value ?? "").replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (_placeholder, field: string) => {
    const rendered = String(context[field]);
    return html ? rendered.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!) : rendered;
  });
  return { subject: render(templates.subject, false), html: render(templates.html, true), text: render(templates.text, false) };
}

async function ensureTemplateVersion(templateKey: string) {
  const admin = getSupabaseAdmin();
  const approved = definition(templateKey);
  let template = await admin.from("email_templates" as never).select("id,active").eq("template_key", templateKey).maybeSingle<{ id: string; active: boolean }>();
  if (template.error) throw template.error;
  if (template.data && !template.data.active) {
    throw new TransactionalEmailIssue("no_active_template_version", "No active email template version is available.", false);
  }
  if (!template.data) {
    const inserted = await admin.from("email_templates" as never).upsert({ template_key: templateKey, name: approved.name, audience: approved.audience, description: "Managed by the approved application renderer.", active: true } as never, { onConflict: "template_key" }).select("id,active").single<{ id: string; active: boolean }>();
    if (inserted.error) throw inserted.error;
    template = inserted;
  }
  // Find the most recent published version (any version number — not hardcoded to v1 so that
  // draft versions created by the template editor coexist without breaking the send path).
  const existing = await admin.from("email_template_versions" as never).select("id").eq("template_id", template.data!.id).not("published_at", "is", null).order("version", { ascending: false }).limit(1).maybeSingle<{ id: string }>();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data.id;
  // No published version exists yet. Find the highest existing version and create the next
  // one as a published application-renderer stub so the send path can proceed.
  const latest = await admin.from("email_template_versions" as never).select("version").eq("template_id", template.data!.id).order("version", { ascending: false }).limit(1).maybeSingle<{ version: number }>();
  if (latest.error) throw latest.error;
  const nextVersion = (latest.data?.version ?? 0) + 1;
  const publishedAt = new Date().toISOString();
  const inserted = await admin.from("email_template_versions" as never).insert({
    template_id: template.data!.id, version: nextVersion, subject_template: approved.subject,
    html_template: approved.secure ? "[secure content unavailable]" : "[rendered by approved application renderer]",
    text_template: approved.secure ? "[secure content unavailable]" : "[rendered by approved application renderer]",
    variable_schema: { fields: approved.fields }, contains_secure_content: approved.secure,
    change_note: "Initial approved application renderer contract.", created_at: publishedAt, published_at: publishedAt,
  } as never).select("id").single<{ id: string }>();
  if (inserted.error) {
    // Concurrent insert — another request already created a published version, use that.
    const concurrent = await admin.from("email_template_versions" as never).select("id").eq("template_id", template.data!.id).not("published_at", "is", null).order("version", { ascending: false }).limit(1).single<{ id: string }>();
    if (concurrent.error) throw inserted.error;
    return concurrent.data.id;
  }
  return inserted.data.id;
}

async function enqueueTransactionalEmailWithProvider(input: EnqueueEmailInput, provider: "resend" | "supabase_auth", externallyAccepted = false) {
  const approved = validateRenderedTransactionalEmail(input.templateKey, input.message);
  const templateVersionId = await ensureTemplateVersion(input.templateKey);
  const sender = address(input.message.from, "sender");
  const recipient = address(Array.isArray(input.message.to) ? input.message.to[0] : input.message.to, "recipient");
  const secure = Boolean(input.secure || approved.secure);
  const redacted = "[secure content unavailable]";
  const admin = getSupabaseAdmin();
  const rpc = admin.rpc.bind(admin) as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: MessageRow | null; error: { message?: string } | null }>;
  const { data, error } = await rpc("transactional_email_enqueue", { requested: {
    template_version_id: templateVersionId, environment: environment(), provider,
    logical_idempotency_key: input.logicalIdempotencyKey, client_id: input.clientId,
    recipient_profile_id: input.recipientProfileId, recipient_user_id: input.recipientUserId,
    recipient_email: recipient.email, recipient_name: input.recipientName ?? recipient.name,
    recipient_snapshot: secure ? { preview: "unavailable" } : (input.recipientSnapshot ?? { name: input.recipientName ?? recipient.name }),
    sender_email: sender.email, sender_name: sender.name, reply_to_email: input.message.replyTo ? address(input.message.replyTo, "reply-to").email : undefined,
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
  if (error instanceof TransactionalEmailIssue) {
    return { code: error.code, message: error.safeMessage, retryable: error.retryable };
  }
  if (error instanceof ResendEmailError) {
    const retryable = error.status === 408 || error.status === 409 || error.status === 429 || error.status >= 500;
    const providerCode = (error.code ?? `http_${error.status}`).slice(0, 120);
    if (error.status === 401 || /api.?key|authentication|unauthorized/i.test(providerCode)) {
      return { code: "provider_authentication_failed", message: "Email provider authentication failed.", retryable: false };
    }
    if (error.status === 403) return { code: "provider_sender_rejected", message: "Email provider rejected the configured sender.", retryable: false };
    if (error.status === 422) return { code: providerCode, message: "Email provider rejected the message data.", retryable: false };
    if (error.status === 429) return { code: providerCode, message: "Email provider rate limit reached.", retryable: true };
    return { code: providerCode, message: `Email provider request failed (${error.status}).`, retryable };
  }
  return { code: "provider_unavailable", message: "Email provider request failed.", retryable: true };
}

export async function processTransactionalEmailQueue(options: { limit?: number; workerId?: string; messageId?: string; secureOverride?: { messageId: string; message: RenderedEmail } } = {}) {
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
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey || apiKey === "re_replace_me") throw new TransactionalEmailIssue("provider_configuration_missing", "Email provider configuration is missing.", true);
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

export function mapResendEventStatus(type: string) {
  const mapped: Record<string, string> = { "email.sent": "sent", "email.delivery_delayed": "deferred", "email.delivered": "delivered", "email.failed": "failed", "email.bounced": "bounced", "email.complained": "complained", "email.suppressed": "suppressed" };
  return mapped[type] ?? null;
}

export async function recordResendProviderEvent(input: { eventId: string; type: string; providerMessageId: string; occurredAt: string }) {
  const status = mapResendEventStatus(input.type);
  if (!status) return null;
  const admin = getSupabaseAdmin();
  const rpc = admin.rpc.bind(admin) as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: MessageRow | null; error: { code?: string; message?: string } | null }>;
  const result = await rpc("transactional_email_record_provider_event", { requested_environment: environment(), requested_provider: "resend", requested_provider_event_id: input.eventId, requested_event_type: input.type, requested_mapped_status: status, requested_occurred_at: input.occurredAt, requested_provider_message_id: input.providerMessageId, requested_payload: { type: input.type, provider_message_id: input.providerMessageId }, requested_payload_redacted: true });
  if (result.error?.code === "P0002") return null;
  if (result.error) throw new Error(result.error.message ?? "Unable to record email event.");
  return result.data;
}
