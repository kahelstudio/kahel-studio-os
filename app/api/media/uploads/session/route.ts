import { NextResponse } from "next/server";
import { extensionForMimeType, isApprovedImageType, MAX_ORIGINAL_BYTES } from "@/lib/media-contract";
import { createDirectUploadUrl, MediaInfrastructureError, sha256Hex } from "@/lib/server/cloudflare-media";
import { hasTrustedOrigin } from "@/lib/server/customer-auth";
import { getStaffPrincipal } from "@/lib/server/staff-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[0-9a-f]{64}$/;

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const principal = await getStaffPrincipal(request);
  if (!principal || (!principal.permissions.includes("galleries.manage") && principal.role === "staff")) {
    return NextResponse.json({ error: "Forbidden." }, { status: principal ? 403 : 401 });
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (!Number.isFinite(contentLength) || contentLength > 16_384) return NextResponse.json({ error: "Request is too large." }, { status: 413 });

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const galleryId = typeof body.galleryId === "string" ? body.galleryId : "";
  const filename = typeof body.filename === "string" ? body.filename.trim() : "";
  const contentType = typeof body.contentType === "string" ? body.contentType.toLowerCase() : "";
  const byteSize = typeof body.byteSize === "number" ? body.byteSize : Number.NaN;
  const checksum = typeof body.checksumSha256 === "string" ? body.checksumSha256.toLowerCase() : null;
  if (!UUID.test(galleryId) || !filename || filename.length > 500 || !isApprovedImageType(contentType)) {
    return NextResponse.json({ error: "Choose a valid JPEG, PNG, or WebP image." }, { status: 400 });
  }
  if (!Number.isSafeInteger(byteSize) || byteSize <= 0 || byteSize > MAX_ORIGINAL_BYTES) {
    return NextResponse.json({ error: "The image size is not allowed." }, { status: 400 });
  }
  if (checksum && !SHA256.test(checksum)) return NextResponse.json({ error: "Invalid SHA-256 checksum." }, { status: 400 });

  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  const acceptedExtensions = contentType === "image/jpeg" ? ["jpg", "jpeg"] : [extensionForMimeType(contentType)];
  if (!acceptedExtensions.includes(extension)) return NextResponse.json({ error: "The file extension does not match its content type." }, { status: 400 });

  const admin = getSupabaseAdmin();
  const galleryResult = await admin.from("galleries").select("id,client_id,project_id,status").eq("id", galleryId).maybeSingle();
  if (galleryResult.error) return NextResponse.json({ error: "Unable to load gallery." }, { status: 500 });
  const gallery = galleryResult.data;
  if (!gallery || gallery.status === "archived" || gallery.status === "expired" || gallery.status === "published") {
    return NextResponse.json({ error: "Uploads are unavailable for this gallery." }, { status: 409 });
  }
  if (checksum) {
    const duplicate = await admin.from("media_assets").select("id").eq("client_id", gallery.client_id).eq("checksum_sha256", checksum).neq("status", "archived").limit(1);
    if (duplicate.error) return NextResponse.json({ error: "Unable to check duplicate media." }, { status: 500 });
    if (duplicate.data?.length) return NextResponse.json({ error: "This image has already been uploaded.", duplicateMediaAssetId: duplicate.data[0].id }, { status: 409 });
  }

  const mediaAssetId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();
  const objectKey = `originals/${gallery.client_id}/${gallery.project_id}/${gallery.id}/${mediaAssetId}.${extensionForMimeType(contentType)}`;
  let directUpload: { uploadUrl: string; expiresAt: string };
  try {
    directUpload = await createDirectUploadUrl({ objectKey, contentType, byteSize });
  } catch (error) {
    const message = error instanceof MediaInfrastructureError ? error.message : "Unable to authorize upload.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
  const completionToken = randomToken();
  const uploadTokenHash = await sha256Hex(completionToken);
  const now = new Date().toISOString();
  const mediaResult = await admin.from("media_assets").insert({
    id: mediaAssetId,
    client_id: gallery.client_id,
    project_id: gallery.project_id,
    private_r2_key: objectKey,
    original_filename: filename,
    original_extension: extension,
    mime_type: contentType,
    byte_size: byteSize,
    checksum_sha256: checksum,
    usage_type: "original",
    visibility: "private",
    status: "uploading",
    created_by: principal.userId,
    updated_by: principal.userId,
  });
  if (mediaResult.error) return NextResponse.json({ error: "Unable to create media record." }, { status: 500 });
  const sessionResult = await admin.from("media_upload_sessions").insert({
    id: sessionId,
    client_id: gallery.client_id,
    project_id: gallery.project_id,
    created_by: principal.userId,
    upload_token_hash: uploadTokenHash,
    expected_mime_type: contentType,
    expected_byte_size: byteSize,
    private_r2_key: objectKey,
    status: "pending",
    expires_at: directUpload.expiresAt,
    completed_asset_id: mediaAssetId,
    created_at: now,
    updated_at: now,
  });
  if (sessionResult.error) {
    await admin.from("media_assets").delete().eq("id", mediaAssetId);
    return NextResponse.json({ error: "Unable to create upload session." }, { status: 500 });
  }

  return NextResponse.json({
    sessionId,
    completionToken,
    uploadUrl: directUpload.uploadUrl,
    expiresAt: directUpload.expiresAt,
    headers: { "Content-Type": contentType },
    resumable: false,
    supportsResume: false,
  }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
