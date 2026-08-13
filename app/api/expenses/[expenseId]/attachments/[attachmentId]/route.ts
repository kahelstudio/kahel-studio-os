import { sanitizeDownloadFilename } from "@/lib/media-contract";
import { getMediaBindings, MediaInfrastructureError } from "@/lib/server/cloudflare-media";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { authorizeExpense, expenseError, UUID } from "../../../_shared";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ expenseId: string; attachmentId: string }> }) {
  const auth = await authorizeExpense(request);
  if ("response" in auth) return auth.response;
  try {
    const { expenseId, attachmentId } = await context.params;
    if (!UUID.test(expenseId) || !UUID.test(attachmentId)) return Response.json({ error: "Attachment not found." }, { status: 404 });
    const admin = getSupabaseAdmin();
    const [expense, claim, attachment] = await Promise.all([
      admin.from("expenses").select("id,created_by,submitted_by").eq("id", expenseId).maybeSingle(),
      admin.from("reimbursement_claims").select("staff_id").eq("expense_id", expenseId).maybeSingle(),
      admin.from("expense_attachments").select("id,media_asset_id").eq("id", attachmentId).eq("expense_id", expenseId).is("removed_at", null).maybeSingle(),
    ]);
    if (expense.error || claim.error || attachment.error) throw expense.error ?? claim.error ?? attachment.error;
    const visible = expense.data && (auth.principal.role !== "staff" || expense.data.created_by === auth.principal.userId || expense.data.submitted_by === auth.principal.userId || claim.data?.staff_id === auth.principal.userId);
    if (!visible || !attachment.data) return Response.json({ error: "Attachment not found." }, { status: 404 });
    const media = await admin.from("media_assets").select("private_r2_key,original_filename,mime_type").eq("id", attachment.data.media_asset_id).maybeSingle();
    if (media.error) throw media.error;
    if (!media.data?.private_r2_key) return Response.json({ error: "Attachment not found." }, { status: 404 });
    let bindings: Awaited<ReturnType<typeof getMediaBindings>>;
    try { bindings = await getMediaBindings(); } catch (error) { return Response.json({ error: error instanceof MediaInfrastructureError ? error.message : "Media infrastructure is unavailable." }, { status: 503 }); }
    const object = await bindings.clientMedia.get(media.data.private_r2_key);
    if (!object) return Response.json({ error: "Attachment not found." }, { status: 404 });
    return new Response(object.body, { headers: { "Content-Type": media.data.mime_type, "Content-Length": String(object.size), "Content-Disposition": `attachment; filename="${sanitizeDownloadFilename(media.data.original_filename)}"`, "Cache-Control": "private, no-store", "Content-Security-Policy": "default-src 'none'; sandbox", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return expenseError(error); }
}
