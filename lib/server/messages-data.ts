import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "./supabase-admin";
import type { StaffPrincipal } from "./staff-auth";
import { TRANSACTIONAL_EMAILS } from "@/lib/transactional-emails";
import { canReadMessage, filterMessages, messageSummary, parseMessageFilters, sanitizeSafeError, type MessageAttempt, type MessageAudit, type MessageEvent, type MessageFilters, type MessageResend, type TransactionalMessage } from "@/lib/messages";

type Row = Record<string, unknown>;
type LooseDatabase = { public: { Tables: Record<string, { Row: Row; Insert: Row; Update: Row; Relationships: [] }>; Views: Record<string, never>; Functions: Record<string, never>; Enums: Record<string, never>; CompositeTypes: Record<string, never> } };
type LooseClient = SupabaseClient<LooseDatabase>;

export type EmailTemplateVersion = { id: string; templateId: string; version: number; subject: string; htmlBody: string | null; textBody: string | null; status: string; secure: boolean; changeNote: string; createdBy: string | null; createdAt: string; publishedAt: string | null };
export type EmailTemplateRecord = { id: string; key: string; name: string; audience: string; status: string; currentVersion: number | null; versions: EmailTemplateVersion[]; catalogue: boolean; trigger: string | null; fields: string[] };
export type MessagesResult = { available: boolean; messages: TransactionalMessage[]; templates: EmailTemplateRecord[]; summary: ReturnType<typeof messageSummary>; reason: string | null };

function db() { return getSupabaseAdmin() as unknown as LooseClient; }
function text(row: Row, ...keys: string[]) { for (const key of keys) if (typeof row[key] === "string") return row[key] as string; return null; }
function numberValue(row: Row, ...keys: string[]) { for (const key of keys) if (typeof row[key] === "number") return row[key] as number; return null; }
function booleanValue(row: Row, key: string, fallback = false) { return typeof row[key] === "boolean" ? row[key] as boolean : fallback; }

function normalizeAttempt(row: Row): MessageAttempt {
  return {
    id: String(row.id ?? ""), messageId: text(row, "transactional_message_id", "message_id") ?? "", number: numberValue(row, "attempt_number"),
    status: text(row, "status", "outcome") ?? "unknown", provider: text(row, "provider"), providerMessageId: text(row, "provider_message_id"),
    errorCode: text(row, "error_code"), error: sanitizeSafeError(text(row, "error_message", "last_error", "error")), retryable: booleanValue(row, "retryable"), actor: text(row, "worker_id", "claimed_by"),
    attemptedAt: text(row, "started_at", "attempted_at", "created_at") ?? new Date(0).toISOString(), finishedAt: text(row, "finished_at"),
  };
}

function normalizeEvent(row: Row): MessageEvent {
  return {
    id: String(row.id ?? ""), messageId: text(row, "transactional_message_id", "message_id") ?? "", type: text(row, "event_type", "type") ?? "unknown",
    status: text(row, "mapped_status"), occurredAt: text(row, "occurred_at", "created_at") ?? new Date(0).toISOString(), receivedAt: text(row, "received_at"),
    providerMessageId: text(row, "provider_message_id"), detail: sanitizeSafeError(text(row, "detail", "description", "error_message")),
  };
}

function moduleFor(row: Row, trigger: string) {
  if (text(row, "booking_id")) return "bookings";
  if (text(row, "invoice_id")) return "invoices";
  if (text(row, "payment_id")) return "payments";
  if (text(row, "gallery_id")) return "galleries";
  if (text(row, "project_id")) return "projects";
  if (text(row, "loyalty_reward_id") || trigger.startsWith("loyalty")) return "loyalty";
  return text(row, "related_type")?.split(".")[0] ?? "system";
}

type References = {
  clients: Map<string, string>; bookings: Map<string, string>; invoices: Map<string, string>; payments: Map<string, string>;
  projects: Map<string, string>; galleries: Map<string, string>;
};

function normalizeMessage(row: Row, attempts: MessageAttempt[], events: MessageEvent[], versions: Map<string, EmailTemplateVersion>, templates: Map<string, EmailTemplateRecord>, references: References): TransactionalMessage {
  const id = text(row, "id") ?? "";
  const status = (text(row, "status", "delivery_status") ?? "queued").toLowerCase();
  const versionId = text(row, "template_version_id");
  const version = versions.get(versionId ?? "");
  const template = version ? templates.get(version.templateId) : undefined;
  const trigger = text(row, "trigger_key", "trigger") ?? template?.key ?? "unknown";
  const clientId = text(row, "client_id");
  const bookingId = text(row, "booking_id"), invoiceId = text(row, "invoice_id"), paymentId = text(row, "payment_id"), projectId = text(row, "project_id"), galleryId = text(row, "gallery_id");
  const acceptedAt = text(row, "accepted_at");
  const sourceReference = text(row, "source_reference");
  return {
    id, templateId: version?.templateId ?? text(row, "template_id", "transactional_message_template_id"), templateVersionId: versionId, templateVersion: version?.version ?? null,
    templateKey: template?.key ?? text(row, "template_key", "template_slug") ?? trigger, recipient: text(row, "recipient_email", "to_email", "recipient", "email") ?? "Unknown recipient",
    recipientName: text(row, "recipient_name", "to_name"), clientName: references.clients.get(clientId ?? "") ?? null, subject: text(row, "rendered_subject", "subject") ?? "(No subject)",
    status, environment: text(row, "environment") ?? "unknown", provider: text(row, "provider") ?? "unknown", providerMessageId: text(row, "provider_message_id"), trigger,
    source: text(row, "source") ?? "system", sourceReference, module: moduleFor(row, trigger), createdAt: text(row, "created_at", "queued_at") ?? new Date(0).toISOString(),
    queuedAt: text(row, "queued_at", "created_at") ?? new Date(0).toISOString(), updatedAt: text(row, "updated_at", "created_at") ?? new Date(0).toISOString(), acceptedAt,
    sentAt: text(row, "sent_at"), deliveredAt: text(row, "delivered_at"), failedAt: text(row, "failed_at"), cancelledAt: text(row, "cancelled_at"), nextAttemptAt: text(row, "next_attempt_at"),
    htmlBody: text(row, "html_body", "rendered_html", "html"), textBody: text(row, "text_body", "rendered_text", "plaintext", "text"),
    containsSecureContent: booleanValue(row, "contains_secure_content"), contentRedacted: booleanValue(row, "content_redacted"), lastErrorCode: text(row, "last_error_code"), lastError: sanitizeSafeError(text(row, "last_error_message", "last_error")),
    retryEligible: booleanValue(row, "retry_eligible"), attemptCount: numberValue(row, "attempt_count") ?? attempts.filter((item) => item.messageId === id).length, maxAttempts: numberValue(row, "max_attempts") ?? 1,
    actor: text(row, "claimed_by") ?? (text(row, "source") === "staff" ? "Staff" : null), parentMessageId: text(row, "parent_message_id"), resendSequence: numberValue(row, "resend_sequence") ?? 0,
    clientId, bookingId, bookingReference: text(row, "booking_reference", "booking_ref") ?? references.bookings.get(bookingId ?? "") ?? null,
    invoiceId, invoiceReference: text(row, "invoice_reference", "invoice_ref") ?? references.invoices.get(invoiceId ?? "") ?? null,
    paymentId, paymentReference: text(row, "payment_reference", "payment_ref") ?? references.payments.get(paymentId ?? "") ?? null,
    projectId, projectReference: text(row, "project_reference", "project_ref") ?? references.projects.get(projectId ?? "") ?? null,
    galleryId, galleryReference: text(row, "gallery_reference", "gallery_ref") ?? references.galleries.get(galleryId ?? "") ?? null,
    attempts: attempts.filter((item) => item.messageId === id), events: events.filter((item) => item.messageId === id), resendHistory: [], audit: [],
  };
}

function normalizeTemplate(row: Row, versionRows: Row[]): EmailTemplateRecord {
  const id = text(row, "id") ?? "";
  const key = text(row, "template_key", "key", "slug") ?? id;
  const versions = versionRows.filter((item) => text(item, "template_id", "transactional_message_template_id") === id).map((item) => ({
    id: text(item, "id") ?? "", templateId: id, version: numberValue(item, "version", "version_number") ?? 1,
    subject: text(item, "subject_template", "subject") ?? "(No subject)", htmlBody: text(item, "html_template", "html_body", "html"), textBody: text(item, "text_template", "text_body", "plaintext", "text"),
    status: text(item, "published_at") ? "published" : "draft", secure: booleanValue(item, "contains_secure_content"), changeNote: text(item, "change_note") ?? "No change note",
    createdBy: text(item, "created_by"), createdAt: text(item, "created_at", "published_at") ?? new Date(0).toISOString(), publishedAt: text(item, "published_at"),
  })).sort((a, b) => b.version - a.version);
  const latestRow = versions.length ? versionRows.find((item) => text(item, "id") === versions[0].id) : null;
  const schema = latestRow?.variable_schema;
  return {
    id, key, name: text(row, "name", "display_name") ?? key, audience: text(row, "audience") ?? "customer", status: row.active === false ? "disabled" : "active",
    currentVersion: versions.find((item) => item.publishedAt)?.version ?? null, versions, catalogue: false, trigger: text(row, "description", "trigger", "trigger_description"),
    fields: schema && typeof schema === "object" && !Array.isArray(schema) ? Object.keys(schema) : [],
  };
}

function catalogueTemplates(): EmailTemplateRecord[] {
  return TRANSACTIONAL_EMAILS.map((item) => ({ id: item.id, key: item.id, name: item.name, audience: item.audience, status: "catalogue", currentVersion: null, versions: [], catalogue: true, trigger: item.trigger, fields: item.fields }));
}

async function table(name: string) { return db().from(name).select("*").limit(1000); }
function mapRows(rows: Row[] | null | undefined, idKey: string, valueKeys: string[]) { return new Map((rows ?? []).map((row) => [text(row, idKey) ?? "", text(row, ...valueKeys) ?? ""])); }

export async function getEmailTemplates(): Promise<{ available: boolean; templates: EmailTemplateRecord[]; reason: string | null }> {
  const [templates, versions] = await Promise.all([table("email_templates"), table("email_template_versions")]);
  if (templates.error) return { available: false, templates: catalogueTemplates(), reason: "Canonical transactional template tables are not available in this environment." };
  const versionRows = versions.error ? [] : versions.data ?? [];
  return { available: true, templates: (templates.data ?? []).map((row) => normalizeTemplate(row, versionRows)), reason: versions.error ? "Template version history is not available." : null };
}

export async function getMessages(principal: StaffPrincipal, filters: MessageFilters): Promise<MessagesResult> {
  const [messageRows, attemptRows, eventRows, templateResult, clientRows, bookingRows, invoiceRows, paymentRows, projectRows, galleryRows] = await Promise.all([
    table("transactional_messages"), table("transactional_message_attempts"), table("transactional_message_events"), getEmailTemplates(),
    db().from("clients").select("id,name").limit(1000), db().from("bookings").select("id,reference").limit(1000), db().from("invoices").select("id,reference").limit(1000),
    db().from("payments").select("id,provider_payment_id").limit(1000), db().from("projects").select("id,reference").limit(1000), db().from("galleries").select("id,slug,title").limit(1000),
  ]);
  if (messageRows.error) return { available: false, messages: [], templates: templateResult.templates, summary: messageSummary([]), reason: "Canonical transactional message tables are not available in this environment." };
  const attempts = attemptRows.error ? [] : (attemptRows.data ?? []).map(normalizeAttempt);
  const events = eventRows.error ? [] : (eventRows.data ?? []).map(normalizeEvent);
  const templateMap = new Map(templateResult.templates.map((template) => [template.id, template]));
  const versionMap = new Map(templateResult.templates.flatMap((template) => template.versions).map((version) => [version.id, version]));
  const references: References = {
    clients: mapRows(clientRows.data as Row[] | null, "id", ["name"]), bookings: mapRows(bookingRows.data as Row[] | null, "id", ["reference"]), invoices: mapRows(invoiceRows.data as Row[] | null, "id", ["reference"]),
    payments: mapRows(paymentRows.data as Row[] | null, "id", ["provider_payment_id"]), projects: mapRows(projectRows.data as Row[] | null, "id", ["reference"]), galleries: mapRows(galleryRows.data as Row[] | null, "id", ["slug", "title"]),
  };
  const scoped = (messageRows.data ?? []).map((row) => normalizeMessage(row, attempts, events, versionMap, templateMap, references)).filter((message) => canReadMessage(message, principal));
  const ids = scoped.map((message) => message.id);
  if (ids.length) {
    const auditRows = await db().from("staff_audit_log").select("*").eq("entity_type", "transactional_message").in("entity_id", ids).limit(1000);
    const audits = (auditRows.data ?? []) as Row[];
    for (const message of scoped) {
      message.resendHistory = scoped.filter((item) => item.parentMessageId === message.id).map((item): MessageResend => ({ id: item.id, status: item.status, sequence: item.resendSequence, createdAt: item.createdAt, actor: item.actor, reason: item.sourceReference }));
      message.audit = audits.filter((row) => text(row, "entity_id") === message.id || (row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) && (row.metadata as Row).parent_message_id === message.id)).map((row): MessageAudit => ({ id: String(row.id ?? ""), actor: text(row, "actor_name") ?? "Unknown actor", event: text(row, "event") ?? "Message updated", occurredAt: text(row, "created_at") ?? new Date(0).toISOString(), detail: sanitizeSafeError(row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? text(row.metadata as Row, "reason") : null) }));
    }
  }
  const messages = filterMessages(scoped, filters).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { available: true, messages, templates: templateResult.templates, summary: messageSummary(messages), reason: attemptRows.error || eventRows.error ? "Attempt or event history is partially unavailable." : null };
}

export async function getEmailHistory(principal: StaffPrincipal, context: { clientId?: string; bookingId?: string; bookingReference?: string; invoiceId?: string; invoiceReference?: string; projectId?: string; projectReference?: string; paymentId?: string; galleryId?: string }) {
  const result = await getMessages(principal, parseMessageFilters({}));
  const values = Object.entries(context).filter((entry): entry is [keyof typeof context, string] => Boolean(entry[1]));
  return { available: result.available, reason: result.reason, messages: result.messages.filter((message) => values.some(([key, value]) => message[key] === value)).slice(0, 20) };
}
