import { authorizeTemplateMutation, auditTemplate, uuid } from "@/app/api/settings/email-templates/_shared";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

type Context = { params: Promise<{ templateId: string }> };

export async function POST(request: Request, { params }: Context) {
  const auth = await authorizeTemplateMutation(request);
  if ("response" in auth) return auth.response;
  const { templateId } = await params;
  if (!uuid(templateId)) return Response.json({ error: "Invalid template." }, { status: 400 });
  const disabled = await getSupabaseAdmin().from("email_templates").update({ active: false, updated_at: new Date().toISOString() }).eq("id", templateId).eq("active", true).select("id").maybeSingle<{ id: string }>();
  if (disabled.error) return Response.json({ error: "Unable to disable the template." }, { status: 503 });
  if (!disabled.data) return Response.json({ error: "Template not found or already disabled." }, { status: 409 });
  await auditTemplate(auth.principal, "Email template disabled", templateId);
  return Response.json({ id: templateId, status: "disabled" });
}
