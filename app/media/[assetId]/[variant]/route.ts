import { NextResponse } from "next/server";
import { PRIVATE_IMAGE_VARIANTS, sanitizeDownloadFilename, type PrivateImageVariant } from "@/lib/media-contract";
import { createSignedCloudflareImageUrl, getMediaBindings, MediaInfrastructureError } from "@/lib/server/cloudflare-media";
import { getCustomerIdentityFromRequest } from "@/lib/server/customer-auth";
import { getStaffPrincipal } from "@/lib/server/staff-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VARIANTS = new Set([...Object.keys(PRIVATE_IMAGE_VARIANTS), "download"]);

type Context = { params: Promise<{ assetId: string; variant: string }> };

function privateHeaders(contentType: string) {
  return new Headers({
    "Cache-Control": "private, no-store, max-age=0",
    "Content-Type": contentType,
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  });
}

function parseRange(value: string | null, size: number) {
  const match = value?.match(/^bytes=(\d+)-(\d*)$/);
  if (!match) return null;
  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : size - 1;
  const end = Math.min(requestedEnd, size - 1);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= size) return null;
  return { offset: start, length: end - start + 1, end };
}

export async function GET(request: Request, { params }: Context) {
  const { assetId, variant } = await params;
  if (!UUID.test(assetId) || !VARIANTS.has(variant)) return NextResponse.json({ error: "Media not found." }, { status: 404 });
  const customer = await getCustomerIdentityFromRequest(request);
  const staff = customer ? null : await getStaffPrincipal(request);
  if (!customer && !staff) return NextResponse.json({ error: "Sign in required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  if (staff && !staff.permissions.includes("galleries.read")) return NextResponse.json({ error: "Media not found." }, { status: 404 });

  const admin = getSupabaseAdmin();
  const mediaResult = await admin.from("media_assets").select("*").eq("id", assetId).maybeSingle();
  if (mediaResult.error) return NextResponse.json({ error: "Unable to load media." }, { status: 500 });
  const media = mediaResult.data;
  if (!media || media.status !== "ready" || !media.private_r2_key) return NextResponse.json({ error: "Media not found." }, { status: 404 });
  if (customer && media.client_id !== customer.clientId) return NextResponse.json({ error: "Media not found." }, { status: 404 });

  const linksResult = await admin.from("gallery_assets").select("id,gallery_id,client_id,visibility,approval_status,downloadable,download_variant").eq("media_asset_id", assetId);
  if (linksResult.error) return NextResponse.json({ error: "Unable to authorize media." }, { status: 500 });
  const links = linksResult.data ?? [];
  if (!links.length && !staff) return NextResponse.json({ error: "Media not found." }, { status: 404 });
  const galleryIds = [...new Set(links.map((link) => link.gallery_id))];
  const galleriesResult = galleryIds.length
    ? await admin.from("galleries").select("id,client_id,status,published,expires_at,downloads_enabled,watermark_enabled").in("id", galleryIds)
    : { data: [], error: null };
  if (galleriesResult.error) return NextResponse.json({ error: "Unable to authorize media." }, { status: 500 });
  const now = Date.now();
  const gallery = (galleriesResult.data ?? []).find((candidate) => {
    if (staff) return true;
    return candidate.client_id === customer?.clientId
      && candidate.status === "published"
      && candidate.published
      && (!candidate.expires_at || new Date(candidate.expires_at).getTime() > now);
  });
  const link = gallery ? links.find((candidate) => candidate.gallery_id === gallery.id) : null;
  if (!staff && (!gallery || !link || link.visibility !== "gallery" || link.approval_status !== "approved")) {
    return NextResponse.json({ error: "Media not found." }, { status: 404 });
  }
  if (variant === "download" && !staff && (!gallery?.downloads_enabled || !link?.downloadable)) {
    return NextResponse.json({ error: "Download not permitted." }, { status: 403 });
  }

  let bindings: Awaited<ReturnType<typeof getMediaBindings>>;
  try {
    bindings = await getMediaBindings();
  } catch (error) {
    const message = error instanceof MediaInfrastructureError ? error.message : "Media infrastructure is unavailable.";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  if (variant !== "download" && media.cloudflare_image_id) {
    const signedUrl = await createSignedCloudflareImageUrl(media.cloudflare_image_id, variant);
    if (signedUrl) return NextResponse.redirect(signedUrl, { headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
  }

  let objectKey: string;
  let contentType = "image/webp";
  let downloadName: string | null = null;
  if (variant === "download") {
    const downloadVariant = link?.download_variant ?? "web";
    if (downloadVariant === "original") {
      objectKey = media.private_r2_key;
      contentType = media.mime_type;
      downloadName = sanitizeDownloadFilename(media.original_filename);
    } else {
      const derivative = downloadVariant === "watermarked" ? "gallery-preview-watermarked" : "gallery-preview";
      objectKey = `derivatives/${media.id}/${derivative}.webp`;
      downloadName = `${sanitizeDownloadFilename(media.original_filename.replace(/\.[^.]+$/, ""))}-${downloadVariant}.webp`;
    }
  } else {
    objectKey = `derivatives/${media.id}/${variant}.webp`;
  }

  const head = await bindings.clientMedia.head(objectKey);
  if (!head) {
    if (variant === "download") return NextResponse.json({ error: "This download is still being prepared." }, { status: 409, headers: { "Cache-Control": "no-store" } });
    const original = await bindings.clientMedia.get(media.private_r2_key);
    if (!original) return NextResponse.json({ error: "Media not found." }, { status: 404 });
    const options = PRIVATE_IMAGE_VARIANTS[variant as PrivateImageVariant];
    try {
      const transformed = await bindings.images.input(original.body).transform({
        width: options.width,
        ...("height" in options && options.height ? { height: options.height } : {}),
        fit: options.fit,
        gravity: options.fit === "cover" ? { x: media.focal_x ?? 0.5, y: media.focal_y ?? 0.5, mode: "box-center" } : "center",
      }).output({ format: "image/webp", quality: variant === "gallery-preview" ? 88 : 82 });
      const response = transformed.response();
      const headers = privateHeaders(response.headers.get("content-type") ?? "image/webp");
      return new Response(response.body, { status: 200, headers });
    } catch {
      return NextResponse.json({ error: "This image is still being processed." }, { status: 409, headers: { "Cache-Control": "no-store" } });
    }
  }

  const range = variant === "download" ? parseRange(request.headers.get("range"), head.size) : null;
  const object = await bindings.clientMedia.get(objectKey, range ? { range: { offset: range.offset, length: range.length } } : undefined);
  if (!object) return NextResponse.json({ error: "Media not found." }, { status: 404 });
  const headers = privateHeaders(contentType);
  headers.set("ETag", object.httpEtag);
  if (variant === "download") {
    headers.set("Accept-Ranges", "bytes");
    headers.set("Content-Disposition", `attachment; filename="${downloadName}"`);
    if (range) {
      headers.set("Content-Range", `bytes ${range.offset}-${range.end}/${head.size}`);
      headers.set("Content-Length", String(range.length));
    } else {
      headers.set("Content-Length", String(head.size));
    }
    if (gallery && link) {
      const activity = await admin.from("gallery_activity").insert({ gallery_id: gallery.id, client_id: gallery.client_id, client_profile_id: customer?.profileId ?? null, actor_user_id: customer?.user.id ?? staff?.userId ?? null, event_type: "asset.downloaded", gallery_asset_id: link.id, metadata: { variant: link.download_variant } });
      if (activity.error) console.error(JSON.stringify({ message: "gallery download audit failed", galleryId: gallery.id, assetId }));
    }
  }
  return new Response(object.body, { status: range ? 206 : 200, headers });
}
