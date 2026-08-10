import { sanitizeDownloadFilename } from "@/lib/media-contract";
import { getMediaBindings, MediaInfrastructureError } from "@/lib/server/cloudflare-media";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { approvalError, authorizeApproval, UUID } from "../../../_shared";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ requestId: string; attachmentId: string }> }) {
  const auth = await authorizeApproval(request);
  if ("response" in auth) return auth.response;
  try {
    const { requestId, attachmentId } = await context.params;
    if (!UUID.test(requestId) || !UUID.test(attachmentId)) return Response.json({ error: "Attachment not found." }, { status: 404 });
    const admin = getSupabaseAdmin();
    const [approval, steps, attachment] = await Promise.all([
      admin.from("approval_requests").select("id,requester_id,amount_php").eq("id", requestId).is("archived_at", null).maybeSingle(),
      admin.from("approval_steps").select("approver_user_id,approver_role").eq("request_id", requestId),
      admin.from("approval_attachments").select("id,media_asset_id").eq("id", attachmentId).eq("request_id", requestId).maybeSingle(),
    ]);
    if (approval.error || steps.error || attachment.error) throw approval.error ?? steps.error ?? attachment.error;
    const visible = approval.data && (approval.data.requester_id === auth.principal.userId || auth.principal.role === "super_admin" || auth.principal.role === "admin" && (approval.data.amount_php === null || (steps.data ?? []).some((step) => step.approver_role === "admin")) || (steps.data ?? []).some((step) => step.approver_user_id === auth.principal.userId || !step.approver_user_id && step.approver_role === auth.principal.role));
    if (!visible || !attachment.data) return Response.json({ error: "Attachment not found." }, { status: 404 });
    const media = await admin.from("media_assets").select("private_r2_key,original_filename,mime_type").eq("id", attachment.data.media_asset_id).maybeSingle();
    if (media.error) throw media.error;
    if (!media.data?.private_r2_key) return Response.json({ error: "Attachment not found." }, { status: 404 });
    let bindings: Awaited<ReturnType<typeof getMediaBindings>>;
    try { bindings = await getMediaBindings(); } catch (error) { return Response.json({ error: error instanceof MediaInfrastructureError ? error.message : "Media infrastructure is unavailable." }, { status: 503 }); }
    const object = await bindings.clientMedia.get(media.data.private_r2_key);
    if (!object) return Response.json({ error: "Attachment not found." }, { status: 404 });
    return new Response(object.body, { headers: { "Content-Type": media.data.mime_type, "Content-Length": String(object.size), "Content-Disposition": `attachment; filename="${sanitizeDownloadFilename(media.data.original_filename)}"`, "Cache-Control": "private, no-store", "Content-Security-Policy": "default-src 'none'; sandbox", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return approvalError(error); }
}
