import { authorizeTemplateMutation, uuid } from "@/app/api/settings/email-templates/_shared";
import { sendResendEmail } from "@/lib/resend-email";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

type Context = { params: Promise<{ templateId: string; versionId: string }> };
type Version = { subject_template: string; html_template: string | null; text_template: string | null; contains_secure_content: boolean };

const MAX_RECIPIENTS = 5;

export async function POST(request: Request, { params }: Context) {
  const auth = await authorizeTemplateMutation(request);
  if ("response" in auth) return auth.response;

  const { templateId, versionId } = await params;
  if (!uuid(templateId) || !uuid(versionId)) return Response.json({ error: "Invalid parameters." }, { status: 400 });

  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }

  const recipients = Array.isArray(body.recipients)
    ? (body.recipients as unknown[]).filter((r): r is string => typeof r === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r)).slice(0, MAX_RECIPIENTS)
    : [];
  if (recipients.length === 0) return Response.json({ error: "At least one valid recipient is required." }, { status: 400 });

  const version = await getSupabaseAdmin()
    .from("email_template_versions")
    .select("subject_template,html_template,text_template,contains_secure_content")
    .eq("id", versionId)
    .eq("template_id", templateId)
    .maybeSingle<Version>();

  if (version.error) return Response.json({ error: "Unable to load the template version." }, { status: 503 });
  if (!version.data) return Response.json({ error: "Template version not found." }, { status: 404 });
  if (version.data.contains_secure_content) return Response.json({ error: "Cannot send test for secure content templates." }, { status: 403 });

  const { html_template: html, text_template: text, subject_template: subject } = version.data;
  if (!html && !text) return Response.json({ error: "This version has no content to send." }, { status: 400 });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === "re_replace_me") return Response.json({ error: "Email sending is not configured (RESEND_API_KEY missing)." }, { status: 503 });

  try {
    await sendResendEmail(apiKey, {
      from: process.env.RESEND_FROM ?? "Kahel Studio <noreply@kahelstudio.com>",
      to: recipients,
      subject: `[Test] ${subject}`,
      html: html ?? "",
      text: text ?? "This email requires HTML to view properly. Contact support@kahelstudio.com for help.",
    });
    return Response.json({ ok: true, recipients });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[transactional-send-test] failed:", message);
    return Response.json({ error: `Send failed: ${message}` }, { status: 502 });
  }
}
