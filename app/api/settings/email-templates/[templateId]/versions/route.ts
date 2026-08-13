import { authorizeTemplateMutation, auditTemplate, string, uuid } from "@/app/api/settings/email-templates/_shared";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

type Context = { params: Promise<{ templateId: string }> };

export async function POST(request: Request, { params }: Context) {
  const auth = await authorizeTemplateMutation(request);
  if ("response" in auth) return auth.response;
  const { templateId } = await params;
  if (!uuid(templateId)) return Response.json({ error: "Invalid template." }, { status: 400 });
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  const subject = string(body.subject, 998), htmlBody = string(body.htmlBody, 200000), textBody = string(body.textBody, 100000), changeNote = string(body.changeNote, 1000);
  const secure = body.secure === true;
  if (!subject || (!htmlBody && !textBody) || !changeNote) return Response.json({ error: "Subject, content, and a change note are required." }, { status: 400 });
  const admin = getSupabaseAdmin();
  const template = await admin.from("email_templates").select("id").eq("id", templateId).maybeSingle<{ id: string }>();
  if (template.error) return Response.json({ error: "Unable to verify the template." }, { status: 503 });
  if (!template.data) return Response.json({ error: "Template not found." }, { status: 404 });
  const latest = await admin.from("email_template_versions").select("version").eq("template_id", templateId).order("version", { ascending: false }).limit(1).maybeSingle<{ version: number }>();
  if (latest.error) return Response.json({ error: "Unable to determine the next version." }, { status: 503 });
  const created = await admin.from("email_template_versions").insert({ template_id: templateId, version: (latest.data?.version ?? 0) + 1, subject_template: subject, html_template: htmlBody || null, text_template: textBody || null, variable_schema: {}, contains_secure_content: secure, change_note: changeNote, created_by: auth.principal.userId }).select("id,version").single<{ id: string; version: number }>();
  if (created.error) return Response.json({ error: "Unable to create the version. Refresh and try again." }, { status: 409 });
  await auditTemplate(auth.principal, "Email template version created", templateId, { version_id: created.data.id, version: created.data.version, change_note: changeNote });
  return Response.json(created.data, { status: 201 });
}
