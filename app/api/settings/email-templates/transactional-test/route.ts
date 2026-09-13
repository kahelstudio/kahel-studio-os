import { authorizeTemplateMutation } from "@/app/api/settings/email-templates/_shared";
import { TRANSACTIONAL_EMAILS } from "@/lib/transactional-emails";
import { generateTransactionalPreviewHtml, generateTransactionalPlainText } from "@/lib/transactional-email-preview";
import { sendResendEmail } from "@/lib/resend-email";

const MAX_RECIPIENTS = 5;

export async function POST(request: Request) {
  const auth = await authorizeTemplateMutation(request);
  if ("response" in auth) return auth.response;

  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }

  const key = typeof body.templateKey === "string" ? body.templateKey.trim() : "";
  const recipients = Array.isArray(body.recipients)
    ? (body.recipients as unknown[]).filter((r): r is string => typeof r === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r)).slice(0, MAX_RECIPIENTS)
    : [];

  if (!key) return Response.json({ error: "templateKey is required." }, { status: 400 });
  if (!recipients.length) return Response.json({ error: "At least one valid recipient is required." }, { status: 400 });

  const template = TRANSACTIONAL_EMAILS.find((t) => t.id === key);
  if (!template) return Response.json({ error: "Unknown transactional template key." }, { status: 404 });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === "re_replace_me") return Response.json({ error: "Email sending is not configured (RESEND_API_KEY missing)." }, { status: 503 });

  try {
    await sendResendEmail(apiKey, {
      from: process.env.RESEND_FROM ?? "Kahel Studio <noreply@kahelstudio.com>",
      to: recipients,
      subject: `[Test] ${template.subject}`,
      html: generateTransactionalPreviewHtml(template),
      text: generateTransactionalPlainText(template),
    });
    return Response.json({ ok: true, recipients });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[transactional-test] send failed:", message);
    return Response.json({ error: `Send failed: ${message}` }, { status: 502 });
  }
}
