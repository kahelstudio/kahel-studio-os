import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "./supabase-admin";
import type { StaffPrincipal } from "./staff-auth";
import { TRANSACTIONAL_EMAILS } from "@/lib/transactional-emails";
import { canReadMessage, filterMessages, messageSummary, type MessageAttempt, type MessageEvent, type MessageFilters, type TransactionalMessage } from "@/lib/messages";

type Row = Record<string, unknown>;
type LooseDatabase = { public: { Tables: Record<string, { Row: Row; Insert: Row; Update: Row; Relationships: [] }>; Views: Record<string, never>; Functions: Record<string, never>; Enums: Record<string, never>; CompositeTypes: Record<string, never> } };
type LooseClient = SupabaseClient<LooseDatabase>;

export type EmailTemplateVersion = { id: string; templateId: string; version: number; subject: string; htmlBody: string | null; textBody: string | null; status: string; createdAt: string };
export type EmailTemplateRecord = { id: string; key: string; name: string; audience: string; status: string; currentVersion: number | null; versions: EmailTemplateVersion[]; catalogue: boolean; trigger: string | null; fields: string[] };
export type MessagesResult = { available: boolean; messages: TransactionalMessage[]; templates: EmailTemplateRecord[]; summary: ReturnType<typeof messageSummary>; reason: string | null };

function db() {
  return getSupabaseAdmin() as unknown as LooseClient;
}

function text(row: Row, ...keys: string[]) {
  for (const key of keys) if (typeof row[key] === "string") return row[key] as string;
  return null;
}

function numberValue(row: Row, ...keys: string[]) {
  for (const key of keys) if (typeof row[key] === "number") return row[key] as number;
  return null;
}

function normalizeAttempt(row: Row): MessageAttempt {
  return { id: String(row.id ?? ""), messageId: text(row, "transactional_message_id", "message_id") ?? "", status: text(row, "status", "outcome") ?? "unknown", providerMessageId: text(row, "provider_message_id"), error: text(row, "error_message", "last_error", "error"), attemptedAt: text(row, "attempted_at", "finished_at", "started_at", "created_at") ?? new Date(0).toISOString() };
}

function normalizeEvent(row: Row): MessageEvent {
  return { id: String(row.id ?? ""), messageId: text(row, "transactional_message_id", "message_id") ?? "", type: text(row, "event_type", "type") ?? "unknown", occurredAt: text(row, "occurred_at", "created_at", "received_at") ?? new Date(0).toISOString(), detail: text(row, "detail", "description", "error_message", "mapped_status") };
}

function normalizeMessage(row: Row, attempts: MessageAttempt[], events: MessageEvent[], versions: Map<string, EmailTemplateVersion>, templates: Map<string, EmailTemplateRecord>, bookingReferences: Map<string, string>, projectReferences: Map<string, string>): TransactionalMessage {
  const id = text(row, "id") ?? "";
  const status = (text(row, "status", "delivery_status") ?? "queued").toLowerCase();
  const version = versions.get(text(row, "template_version_id") ?? "");
  const template = version ? templates.get(version.templateId) : undefined;
  return {
    id,
    templateId: version?.templateId ?? text(row, "template_id", "transactional_message_template_id"),
    templateKey: template?.key ?? text(row, "template_key", "template_slug", "trigger_key", "kind") ?? "unknown-template",
    recipient: text(row, "recipient_email", "to_email", "recipient", "email") ?? "Unknown recipient",
    recipientName: text(row, "recipient_name", "to_name"),
    subject: text(row, "rendered_subject", "subject") ?? "(No subject)",
    status,
    createdAt: text(row, "created_at", "queued_at") ?? new Date(0).toISOString(),
    sentAt: text(row, "sent_at", "accepted_at"), deliveredAt: text(row, "delivered_at"), failedAt: text(row, "failed_at"),
    htmlBody: text(row, "html_body", "rendered_html", "html"), textBody: text(row, "text_body", "rendered_text", "plaintext", "text"),
    clientId: text(row, "client_id"), bookingId: text(row, "booking_id"), bookingReference: text(row, "booking_reference", "booking_ref") ?? bookingReferences.get(text(row, "booking_id") ?? "") ?? null,
    projectId: text(row, "project_id"), projectReference: text(row, "project_reference", "project_ref") ?? projectReferences.get(text(row, "project_id") ?? "") ?? null, paymentId: text(row, "payment_id"), galleryId: text(row, "gallery_id"),
    attempts: attempts.filter((item) => item.messageId === id), events: events.filter((item) => item.messageId === id),
  };
}

function normalizeTemplate(row: Row, versionRows: Row[]): EmailTemplateRecord {
  const id = text(row, "id") ?? "";
  const key = text(row, "template_key", "key", "slug") ?? id;
  const versions = versionRows.filter((version) => text(version, "template_id", "transactional_message_template_id") === id).map((version) => ({
    id: text(version, "id") ?? "", templateId: id, version: numberValue(version, "version", "version_number") ?? 1,
    subject: text(version, "subject_template", "subject") ?? "(No subject)", htmlBody: text(version, "html_template", "html_body", "html"), textBody: text(version, "text_template", "text_body", "plaintext", "text"),
    status: text(version, "published_at") ? "published" : "draft", createdAt: text(version, "created_at", "published_at") ?? new Date(0).toISOString(),
  })).sort((a, b) => b.version - a.version);
  const schema = versions.length ? versionRows.find((version) => text(version, "id") === versions[0].id)?.variable_schema : null;
  return { id, key, name: text(row, "name", "display_name") ?? key, audience: text(row, "audience") ?? "customer", status: row.active === false ? "inactive" : "active", currentVersion: versions[0]?.version ?? null, versions, catalogue: false, trigger: text(row, "description", "trigger", "trigger_description"), fields: schema && typeof schema === "object" && !Array.isArray(schema) ? Object.keys(schema) : [] };
}

function catalogueTemplates(): EmailTemplateRecord[] {
  return TRANSACTIONAL_EMAILS.map((item) => ({ id: item.id, key: item.id, name: item.name, audience: item.audience, status: "catalogue", currentVersion: null, versions: [], catalogue: true, trigger: item.trigger, fields: item.fields }));
}

async function table(name: string) {
  return db().from(name).select("*").limit(1000);
}

export async function getEmailTemplates(): Promise<{ available: boolean; templates: EmailTemplateRecord[]; reason: string | null }> {
  const [templates, versions] = await Promise.all([table("email_templates"), table("email_template_versions")]);
  if (templates.error) return { available: false, templates: catalogueTemplates(), reason: "Canonical transactional template tables are not available in this environment." };
  const versionRows = versions.error ? [] : versions.data ?? [];
  return { available: true, templates: (templates.data ?? []).map((row) => normalizeTemplate(row, versionRows)), reason: versions.error ? "Template version history is not available." : null };
}

export async function getMessages(principal: StaffPrincipal, filters: MessageFilters): Promise<MessagesResult> {
  const [messageRows, attemptRows, eventRows, templateResult, bookingRows, projectRows] = await Promise.all([table("transactional_messages"), table("transactional_message_attempts"), table("transactional_message_events"), getEmailTemplates(), db().from("bookings").select("id,reference").limit(1000), db().from("projects").select("id,reference").limit(1000)]);
  if (messageRows.error) return { available: false, messages: [], templates: templateResult.templates, summary: messageSummary([]), reason: "Canonical transactional message tables are not available in this environment." };
  const attempts = attemptRows.error ? [] : (attemptRows.data ?? []).map(normalizeAttempt);
  const events = eventRows.error ? [] : (eventRows.data ?? []).map(normalizeEvent);
  const templateMap = new Map(templateResult.templates.map((template) => [template.id, template]));
  const versionMap = new Map(templateResult.templates.flatMap((template) => template.versions).map((version) => [version.id, version]));
  const bookingReferences = new Map((bookingRows.data ?? []).map((row) => [text(row, "id") ?? "", text(row, "reference") ?? ""]));
  const projectReferences = new Map((projectRows.data ?? []).map((row) => [text(row, "id") ?? "", text(row, "reference") ?? ""]));
  const scoped = (messageRows.data ?? []).map((row) => normalizeMessage(row, attempts, events, versionMap, templateMap, bookingReferences, projectReferences)).filter((message) => canReadMessage(message, principal));
  const messages = filterMessages(scoped, filters).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { available: true, messages, templates: templateResult.templates, summary: messageSummary(scoped), reason: attemptRows.error || eventRows.error ? "Attempt or event history is partially unavailable." : null };
}

export async function getEmailHistory(principal: StaffPrincipal, context: { clientId?: string; bookingId?: string; bookingReference?: string; projectId?: string; projectReference?: string; paymentId?: string; galleryId?: string }) {
  const result = await getMessages(principal, { query: "", status: "all", template: "", from: "", to: "" });
  const values = Object.entries(context).filter((entry): entry is [keyof typeof context, string] => Boolean(entry[1]));
  return { available: result.available, reason: result.reason, messages: result.messages.filter((message) => values.some(([key, value]) => message[key] === value)).slice(0, 20) };
}
