import { NextResponse } from "next/server";
import { hasApprovedImageSignature, isApprovedImageType, type MediaProcessingMessage } from "@/lib/media-contract";
import { getMediaBindings, MediaInfrastructureError, secureTokenMatches } from "@/lib/server/cloudflare-media";
import { hasTrustedOrigin } from "@/lib/server/customer-auth";
import { getStaffPrincipal } from "@/lib/server/staff-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const principal = await getStaffPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Forbidden." }, { status: 401 });
  const { sessionId } = await params;
  if (!UUID.test(sessionId)) return NextResponse.json({ error: "Invalid upload session." }, { status: 400 });
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const galleryId = typeof body.galleryId === "string" ? body.galleryId : "";
  const approvalId = typeof body.approvalId === "string" ? body.approvalId : "";
  const completionToken = typeof body.completionToken === "string" ? body.completionToken : "";
  if ((!UUID.test(galleryId) && !UUID.test(approvalId)) || (galleryId && approvalId) || completionToken.length !== 64) return NextResponse.json({ error: "Invalid upload completion." }, { status: 400 });

  const admin = getSupabaseAdmin();
  const sessionResult = await admin.from("media_upload_sessions").select("*").eq("id", sessionId).maybeSingle();
  if (sessionResult.error) return NextResponse.json({ error: "Unable to load upload session." }, { status: 500 });
  const session = sessionResult.data;
  if (!session || !await secureTokenMatches(completionToken, session.upload_token_hash)) {
    return NextResponse.json({ error: "Upload session not found." }, { status: 404 });
  }
  if (new Date(session.expires_at).getTime() <= Date.now() && session.status !== "completed") {
    await admin.from("media_upload_sessions").update({ status: "expired" }).eq("id", sessionId);
    return NextResponse.json({ error: "The upload session has expired." }, { status: 410 });
  }
  if (approvalId) {
    const approval = await admin.from("approval_requests").select("id,requester_id,client_id,project_id,status").eq("id", approvalId).is("archived_at", null).maybeSingle();
    if (approval.error) return NextResponse.json({ error: "Unable to load approval request." }, { status: 500 });
    if (!approval.data || approval.data.status === "withdrawn" || principal.role === "staff" && approval.data.requester_id !== principal.userId || approval.data.client_id !== session.client_id || approval.data.project_id !== session.project_id) return NextResponse.json({ error: "The upload does not belong to an accessible approval request." }, { status: 409 });
    const mediaAssetId = session.completed_asset_id;
    if (!mediaAssetId) return NextResponse.json({ error: "The upload session is incomplete." }, { status: 409 });
    let bindings: Awaited<ReturnType<typeof getMediaBindings>>;
    try { bindings = await getMediaBindings(); } catch (error) { return NextResponse.json({ error: error instanceof MediaInfrastructureError ? error.message : "Media infrastructure is unavailable." }, { status: 503 }); }
    if (session.status !== "completed") {
      const object = await bindings.clientMedia.head(session.private_r2_key);
      const approvalMimeAllowed = isApprovedImageType(session.expected_mime_type ?? "") || session.expected_mime_type === "application/pdf";
      if (!object || object.size !== session.expected_byte_size || object.httpMetadata?.contentType !== session.expected_mime_type || !approvalMimeAllowed) return NextResponse.json({ error: "The uploaded file did not match its authorization." }, { status: 422 });
      const firstBytesObject = await bindings.clientMedia.get(session.private_r2_key, { range: { offset: 0, length: 16 } });
      const firstBytes = firstBytesObject ? new Uint8Array(await firstBytesObject.arrayBuffer()) : new Uint8Array();
      const validSignature = session.expected_mime_type === "application/pdf" ? new TextDecoder().decode(firstBytes.slice(0, 5)) === "%PDF-" : isApprovedImageType(session.expected_mime_type) && hasApprovedImageSignature(firstBytes, session.expected_mime_type);
      if (!validSignature) { await bindings.clientMedia.delete(session.private_r2_key); return NextResponse.json({ error: "The uploaded file signature is invalid." }, { status: 422 }); }
      const now = new Date().toISOString();
      const attachment = await admin.from("approval_attachments").upsert({ request_id: approvalId, media_asset_id: mediaAssetId, uploaded_by: principal.userId }, { onConflict: "request_id,media_asset_id" });
      const mediaUpdate = await admin.from("media_assets").update({ status: "uploaded", uploaded_at: now, updated_by: principal.userId }).eq("id", mediaAssetId);
      const sessionUpdate = await admin.from("media_upload_sessions").update({ status: "completed", updated_at: now }).eq("id", sessionId);
      if (attachment.error || mediaUpdate.error || sessionUpdate.error) return NextResponse.json({ error: "Unable to finalize approval attachment." }, { status: 500 });
    }
    return NextResponse.json({ mediaAssetId, status: "uploaded" }, { status: 201, headers: { "Cache-Control": "no-store" } });
  }
  if (!principal.permissions.includes("galleries.manage") && principal.role === "staff") return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const galleryResult = await admin.from("galleries").select("id,client_id,project_id,status,watermark_enabled").eq("id", galleryId).eq("client_id", session.client_id ?? "").maybeSingle();
  if (galleryResult.error) return NextResponse.json({ error: "Unable to load gallery." }, { status: 500 });
  const gallery = galleryResult.data;
  if (!gallery || gallery.project_id !== session.project_id || ["published", "archived", "expired"].includes(gallery.status)) {
    return NextResponse.json({ error: "The upload does not belong to an editable gallery." }, { status: 409 });
  }
  const mediaAssetId = session.completed_asset_id;
  if (!mediaAssetId) return NextResponse.json({ error: "The upload session is incomplete." }, { status: 409 });

  let bindings: Awaited<ReturnType<typeof getMediaBindings>>;
  try {
    bindings = await getMediaBindings();
  } catch (error) {
    return NextResponse.json({ error: error instanceof MediaInfrastructureError ? error.message : "Media infrastructure is unavailable." }, { status: 503 });
  }

  if (session.status !== "completed") {
    const object = await bindings.clientMedia.head(session.private_r2_key);
    if (!object || object.size !== session.expected_byte_size || object.httpMetadata?.contentType !== session.expected_mime_type || !isApprovedImageType(session.expected_mime_type ?? "")) {
      await Promise.all([
        admin.from("media_upload_sessions").update({ status: "failed", failure_message: "Uploaded object metadata did not match the authorization." }).eq("id", sessionId),
        admin.from("media_assets").update({ status: "failed", processing_failure_code: "upload_metadata_mismatch", processing_failure_message: "Uploaded object metadata did not match the authorization." }).eq("id", mediaAssetId),
      ]);
      return NextResponse.json({ error: "The uploaded file did not match its authorization." }, { status: 422 });
    }
    const firstBytesObject = await bindings.clientMedia.get(session.private_r2_key, { range: { offset: 0, length: 16 } });
    const firstBytes = firstBytesObject ? new Uint8Array(await firstBytesObject.arrayBuffer()) : new Uint8Array();
    if (!isApprovedImageType(session.expected_mime_type) || !hasApprovedImageSignature(firstBytes, session.expected_mime_type)) {
      await bindings.clientMedia.delete(session.private_r2_key);
      await Promise.all([
        admin.from("media_upload_sessions").update({ status: "failed", failure_message: "The uploaded file signature is invalid." }).eq("id", sessionId),
        admin.from("media_assets").update({ status: "failed", processing_failure_code: "invalid_signature", processing_failure_message: "The uploaded file signature is invalid." }).eq("id", mediaAssetId),
      ]);
      return NextResponse.json({ error: "The uploaded file is not a valid supported image." }, { status: 422 });
    }
    const assetExists = await admin.from("gallery_assets").select("id").eq("gallery_id", galleryId).eq("media_asset_id", mediaAssetId).maybeSingle();
    if (assetExists.error) return NextResponse.json({ error: "Unable to finalize gallery asset." }, { status: 500 });
    if (!assetExists.data) {
      const orderResult = await admin.from("gallery_assets").select("sort_order").eq("gallery_id", galleryId).order("sort_order", { ascending: false }).limit(1).maybeSingle();
      if (orderResult.error) return NextResponse.json({ error: "Unable to finalize gallery asset." }, { status: 500 });
      const mediaResult = await admin.from("media_assets").select("original_filename,mime_type").eq("id", mediaAssetId).single();
      if (mediaResult.error) return NextResponse.json({ error: "Unable to finalize media asset." }, { status: 500 });
      const linked = await admin.from("gallery_assets").insert({
        gallery_id: galleryId,
        client_id: gallery.client_id,
        media_asset_id: mediaAssetId,
        storage_path: session.private_r2_key,
        asset_type: "image",
        title: mediaResult.data.original_filename,
        sort_order: (orderResult.data?.sort_order ?? -1) + 1,
        visibility: "gallery",
        approval_status: "pending",
        downloadable: false,
        download_variant: gallery.watermark_enabled ? "watermarked" : "web",
      });
      if (linked.error) return NextResponse.json({ error: "Unable to add image to gallery." }, { status: 500 });
    }
    const now = new Date().toISOString();
    const [mediaUpdate, sessionUpdate, galleryUpdate] = await Promise.all([
      admin.from("media_assets").update({ status: "uploaded", uploaded_at: now, updated_by: principal.userId }).eq("id", mediaAssetId),
      admin.from("media_upload_sessions").update({ status: "completed", updated_at: now }).eq("id", sessionId),
      admin.from("galleries").update({ status: "processing", updated_at: now }).eq("id", galleryId),
    ]);
    if (mediaUpdate.error || sessionUpdate.error || galleryUpdate.error) return NextResponse.json({ error: "Unable to finalize upload." }, { status: 500 });
  }

  const jobId = crypto.randomUUID();
  const jobResult = await admin.from("media_processing_jobs").insert({
    id: jobId,
    media_asset_id: mediaAssetId,
    client_id: gallery.client_id,
    job_type: "process-image",
    idempotency_key: `process-image:${mediaAssetId}`,
    status: "pending",
    input: { galleryId },
  }).select("id").single();
  const persistedJobId = jobResult.error?.code === "23505"
    ? (await admin.from("media_processing_jobs").select("id").eq("idempotency_key", `process-image:${mediaAssetId}`).single()).data?.id
    : jobResult.data?.id;
  if (!persistedJobId) return NextResponse.json({ error: "Unable to queue image processing." }, { status: 500 });
  const message: MediaProcessingMessage = { kind: "process-image", jobId: persistedJobId, mediaAssetId, galleryId, watermark: gallery.watermark_enabled };
  await bindings.processing.send(message, { contentType: "json" });
  return NextResponse.json({ mediaAssetId, status: "processing" }, { status: 202, headers: { "Cache-Control": "no-store" } });
}
