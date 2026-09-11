import { authorizeTemplateMutation } from "@/app/api/settings/email-templates/_shared";
import { AUTH_EMAIL_TEMPLATES, resolveAuthTemplateHtml } from "@/lib/auth-email-templates";
import { sendResendEmail } from "@/lib/resend-email";

const MAX_RECIPIENTS = 5;

export async function POST(request: Request) {
  const auth = await authorizeTemplateMutation(request);
  if ("response" in auth) return auth.response;

  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }

  const key = typeof body.templateKey === "string" ? body.templateKey.trim() : "";
  const recipients = Array.isArray(body.recipients) ? (body.recipients as unknown[]).filter((r): r is string => typeof r === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r)).slice(0, MAX_RECIPIENTS) : [];

  if (!key) return Response.json({ error: "templateKey is required." }, { status: 400 });
  if (recipients.length === 0) return Response.json({ error: "At least one valid recipient is required." }, { status: 400 });

  const template = AUTH_EMAIL_TEMPLATES.find((t) => t.key === key);
  if (!template) return Response.json({ error: "Unknown auth template key." }, { status: 404 });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === "re_replace_me") return Response.json({ error: "Email sending is not configured (RESEND_API_KEY missing)." }, { status: 503 });

  const html = resolveAuthTemplateHtml(template);
  const subject = `[Test] ${template.subject}`;

  try {
    await sendResendEmail(apiKey, {
      from: process.env.RESEND_FROM ?? "Kahel Studio <noreply@kahelstudio.com>",
      to: recipients,
      subject,
      html,
      text: `Test email: ${subject}\n\nThis email requires an HTML-capable client to view properly.\n\nNeed help? support@kahelstudio.com`,
    });
    return Response.json({ ok: true, recipients, subject });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[auth-email-templates] Test send failed:", message);
    return Response.json({ error: `Send failed: ${message}` }, { status: 502 });
  }
}
