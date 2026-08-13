import { authorizeTemplateMutation, auditTemplate, string, uuid } from "@/app/api/settings/email-templates/_shared";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import type { Json } from "@/lib/server/supabase-database";

type Context = { params: Promise<{ templateId: string; versionId: string }> };
type Version = { id: string; template_id: string; subject_template: string; html_template: string | null; text_template: string | null; variable_schema: Json; contains_secure_content: boolean; change_note: string };

export async function POST(request: Request, { params }: Context) {
  const auth = await authorizeTemplateMutation(request);
  if ("response" in auth) return auth.response;
  const { templateId, versionId } = await params;
  if (!uuid(templateId) || !uuid(versionId)) return Response.json({ error: "Invalid template version." }, { status: 400 });
  let body: Record<string, unknown> = {};
  try { body = await request.json() as Record<string, unknown>; } catch { /* A publication note is optional. */ }
  const note = string(body.changeNote, 1000);
  const admin = getSupabaseAdmin();
  const [source, latest] = await Promise.all([
    admin.from("email_template_versions").select("id,template_id,subject_template,html_template,text_template,variable_schema,contains_secure_content,change_note").eq("id", versionId).eq("template_id", templateId).maybeSingle<Version>(),
    admin.from("email_template_versions").select("version").eq("template_id", templateId).order("version", { ascending: false }).limit(1).maybeSingle<{ version: number }>(),
  ]);
  if (source.error || latest.error) return Response.json({ error: "Unable to verify the template version." }, { status: 503 });
  if (!source.data) return Response.json({ error: "Template version not found." }, { status: 404 });
  const published = await admin.from("email_template_versions").insert({ template_id: templateId, version: (latest.data?.version ?? 0) + 1, subject_template: source.data.subject_template, html_template: source.data.html_template, text_template: source.data.text_template, variable_schema: source.data.variable_schema, contains_secure_content: source.data.contains_secure_content, change_note: note || `Published from version ${latest.data?.version ?? 1}: ${source.data.change_note}`.slice(0, 1000), published_at: new Date().toISOString(), created_by: auth.principal.userId }).select("id,version,published_at").single<{ id: string; version: number; published_at: string }>();
  if (published.error) return Response.json({ error: "Unable to publish. Refresh and try again." }, { status: 409 });
  await auditTemplate(auth.principal, "Email template version published", templateId, { version_id: published.data.id, version: published.data.version, source_version_id: versionId });
  return Response.json(published.data, { status: 201 });
}
