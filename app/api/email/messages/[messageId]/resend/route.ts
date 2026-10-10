import { hasTrustedOrigin } from "@/lib/server/customer-auth";
import { getStaffPrincipal } from "@/lib/server/staff-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { processTransactionalEmailQueue, renderTransactionalTemplate, TransactionalEmailIssue, validateRenderedTransactionalEmail } from "@/lib/server/transactional-email-service";

export const runtime = "nodejs";
type Context = { params: Promise<{ messageId: string }> };
type OriginalMessage = {
  contains_secure_content: boolean; status: string; retry_eligible: boolean;
  client_id: string | null; recipient_profile_id: string | null; booking_id: string | null;
  template_version_id: string; recipient_email: string; recipient_name: string | null;
  render_context: Record<string, unknown>;
  rendered_subject: string; rendered_html: string | null; rendered_text: string | null;
  sender_email: string; sender_name: string | null; reply_to_email: string | null;
};

export async function POST(request: Request, { params }: Context) {
  const principal = await getStaffPrincipal(request);
  if (!principal) return Response.json({ error: "Unauthorized." }, { status: 401 });
  if (!hasTrustedOrigin(request) || !["admin", "super_admin"].includes(principal.role)) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  const { messageId } = await params;
  const idempotencyKey = request.headers.get("idempotency-key")?.trim();
  let body: { reason?: unknown };
  try { body = await request.json() as typeof body; } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!/^[0-9a-f-]{36}$/i.test(messageId) || !idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 100 || reason.length < 5 || reason.length > 180) {
    return Response.json({ error: "Message, idempotency key, and a meaningful reason are required." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const resendReason = `[${idempotencyKey}] ${reason}`.slice(0, 235);
  const sourceReference = `manual-resend: ${resendReason}`;
  const original = await admin.from("transactional_messages" as never).select("contains_secure_content,status,retry_eligible,client_id,recipient_profile_id,booking_id,template_version_id,recipient_email,recipient_name,render_context,rendered_subject,rendered_html,rendered_text,sender_email,sender_name,reply_to_email").eq("id", messageId).maybeSingle<OriginalMessage>();
  if (original.error) return Response.json({ error: "Unable to verify resend eligibility." }, { status: 503 });
  if (!original.data) return Response.json({ error: "Message was not found." }, { status: 404 });

  // A repeated request must reuse its first result even after the original becomes ineligible.
  const prior = await admin.from("transactional_messages" as never).select("id,status").eq("parent_message_id", messageId).eq("source_reference", sourceReference).maybeSingle<{ id: string; status: string }>();
  if (prior.error) return Response.json({ error: "Unable to verify resend eligibility." }, { status: 503 });
  if (prior.data) return Response.json({ messageId: prior.data.id, status: prior.data.status, reused: true });
  if (original.data.contains_secure_content) return Response.json({ error: "Security emails cannot be resent from stored history." }, { status: 409 });
  if (original.data.status !== "failed" || !original.data.retry_eligible) {
    return Response.json({ error: "Only safe transient failures can be resent." }, { status: 409 });
  }

  let recipientEmail = original.data.recipient_email;
  let recipientName = original.data.recipient_name;
  const renderContext = { ...(original.data.render_context ?? {}) };
  if (original.data.recipient_profile_id && original.data.client_id) {
    const profile = await admin.from("client_profiles").select("email,first_name,last_name,status").eq("id", original.data.recipient_profile_id).eq("client_id", original.data.client_id).maybeSingle<{ email: string; first_name: string; last_name: string; status: string }>();
    if (profile.error) return Response.json({ error: "Unable to resolve the current recipient." }, { status: 503 });
    if (!profile.data || !["active", "invited"].includes(profile.data.status) || !profile.data.email.trim()) {
      return Response.json({ error: "The message no longer has an active recipient email." }, { status: 422 });
    }
    recipientEmail = profile.data.email.trim().toLowerCase();
    recipientName = `${profile.data.first_name} ${profile.data.last_name}`.trim();
    Object.assign(renderContext, { client_name: recipientName, customer_name: recipientName, customer_email: recipientEmail });
  }
  if (original.data.booking_id && original.data.client_id) {
    const booking = await admin.from("bookings").select("id,reference,service_type,service_date,service_time,location,total_amount_php,paid_amount_php").eq("id", original.data.booking_id).eq("client_id", original.data.client_id).maybeSingle<{ id: string; reference: string; service_type: string; service_date: string; service_time: string; location: string; total_amount_php: number; paid_amount_php: number }>();
    if (booking.error) return Response.json({ error: "Unable to verify the related booking." }, { status: 503 });
    if (!booking.data) return Response.json({ error: "The related booking is no longer available." }, { status: 422 });
    const money = (centavos: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(centavos / 100);
    Object.assign(renderContext, {
      booking_id: booking.data.reference,
      booking_reference: booking.data.reference,
      service_name: booking.data.service_type,
      booking_date: booking.data.service_date,
      booking_time: booking.data.service_time,
      location: booking.data.location,
      amount_paid: money(booking.data.paid_amount_php),
      balance_due: money(Math.max(0, booking.data.total_amount_php - booking.data.paid_amount_php)),
    });
  }

  const version = await admin.from("email_template_versions" as never).select("template_id").eq("id", original.data.template_version_id).maybeSingle<{ template_id: string }>();
  if (version.error) return Response.json({ error: "Unable to resolve the email template." }, { status: 503 });
  if (!version.data) return Response.json({ error: "No active email template version is available." }, { status: 422 });
  const template = await admin.from("email_templates" as never).select("template_key,active").eq("id", version.data.template_id).maybeSingle<{ template_key: string; active: boolean }>();
  if (template.error) return Response.json({ error: "Unable to resolve the email template." }, { status: 503 });
  if (!template.data?.active) return Response.json({ error: "No active email template version is available." }, { status: 422 });
  const latestVersion = await admin.from("email_template_versions" as never).select("id,subject_template,html_template,text_template").eq("template_id", version.data.template_id).not("published_at", "is", null).order("version", { ascending: false }).limit(1).maybeSingle<{ id: string; subject_template: string; html_template: string | null; text_template: string | null }>();
  if (latestVersion.error) return Response.json({ error: "Unable to resolve the email template." }, { status: 503 });
  if (!latestVersion.data) return Response.json({ error: "No active email template version is available." }, { status: 422 });

  let rendered = { subject: original.data.rendered_subject, html: original.data.rendered_html ?? "", text: original.data.rendered_text ?? "" };
  let refreshedTemplateVersionId = original.data.template_version_id;
  try {
    // Application-renderer stubs deliberately preserve the approved application-rendered body.
    // Real published DB templates are regenerated from the latest stored and related-record data.
    const hasRenderableBody = [latestVersion.data.html_template, latestVersion.data.text_template]
      .some((value) => Boolean(value && !value.trim().startsWith("[")));
    if (hasRenderableBody) {
      rendered = renderTransactionalTemplate(template.data.template_key, {
        subject: latestVersion.data.subject_template,
        html: latestVersion.data.html_template,
        text: latestVersion.data.text_template,
      }, renderContext);
      refreshedTemplateVersionId = latestVersion.data.id;
    }
    validateRenderedTransactionalEmail(template.data.template_key, {
      to: recipientEmail,
      from: original.data.sender_name ? `${original.data.sender_name} <${original.data.sender_email}>` : original.data.sender_email,
      replyTo: original.data.reply_to_email ?? undefined,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  } catch (error) {
    const message = error instanceof TransactionalEmailIssue ? error.safeMessage : "The stored email content could not be validated.";
    return Response.json({ error: message }, { status: 422 });
  }

  const rpc = admin.rpc as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: { id: string; status: string } | null; error: { message?: string } | null }>;
  const result = await rpc("transactional_email_prepare_manual_resend", { requested_message_id: messageId, requested_reason: resendReason });
  if (result.error || !result.data) {
    const concurrent = await admin.from("transactional_messages" as never).select("id,status").eq("parent_message_id", messageId).eq("source_reference", sourceReference).maybeSingle<{ id: string; status: string }>();
    if (concurrent.data) return Response.json({ messageId: concurrent.data.id, status: concurrent.data.status, reused: true });
    return Response.json({ error: "Message is not eligible for manual resend." }, { status: 409 });
  }

  const refreshed = await admin.from("transactional_messages" as never).update({
    template_version_id: refreshedTemplateVersionId,
    recipient_email: recipientEmail,
    recipient_name: recipientName,
    recipient_snapshot: { profileId: original.data.recipient_profile_id, email: recipientEmail, name: recipientName, refreshedAt: new Date().toISOString() },
    render_context: renderContext,
    rendered_subject: rendered.subject,
    rendered_html: rendered.html,
    rendered_text: rendered.text,
    updated_at: new Date().toISOString(),
  } as never).eq("id", result.data.id);
  if (refreshed.error) {
    await admin.from("transactional_messages" as never).update({ status: "cancelled", retry_eligible: false, last_error_code: "retry_refresh_failed", last_error_message: "Retry data could not be refreshed.", cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() } as never).eq("id", result.data.id);
    await admin.from("transactional_messages" as never).update({ retry_eligible: true, updated_at: new Date().toISOString() } as never).eq("id", messageId).eq("status", "failed");
    return Response.json({ error: "The retry could not be prepared safely." }, { status: 503 });
  }

  const audit = await admin.from("staff_audit_log").insert({ actor_id: principal.userId, actor_name: principal.email, event: "Transactional email manually requeued", event_type: "system", entity_type: "transactional_message", entity_id: result.data.id, metadata: { parent_message_id: messageId, reason, idempotency_key: idempotencyKey, recipient_refreshed: true, template_version_refreshed: refreshedTemplateVersionId !== original.data.template_version_id } });
  if (audit.error) console.error("[transactional-email] Manual resend audit failed", result.data.id, audit.error.code);
  await processTransactionalEmailQueue({ limit: 1, messageId: result.data.id, workerId: `staff:${principal.userId ?? principal.email}` });
  const current = await admin.from("transactional_messages" as never).select("status,last_error_code,last_error_message").eq("id", result.data.id).single<{ status: string; last_error_code: string | null; last_error_message: string | null }>();
  if (current.error) return Response.json({ error: "The retry was processed, but its result could not be loaded." }, { status: 503 });
  const accepted = ["provider_accepted", "sent", "delivered"].includes(current.data.status);
  return Response.json({ messageId: result.data.id, status: current.data.status, reused: false, ...(accepted ? {} : { errorCode: current.data.last_error_code, error: current.data.last_error_message ?? "Email provider request failed." }) }, { status: accepted ? 200 : 502 });
}
