import type { MediaProcessingMessage, PrivateImageVariant } from "../lib/media-contract";
import { PRIVATE_IMAGE_VARIANTS } from "../lib/media-contract";
import { sendResendEmail } from "../lib/resend-email";

declare global {
  interface MediaProcessorEnv {
    RESEND_API_KEY: string;
  }
}

type MediaRow = {
  id: string;
  client_id: string;
  private_r2_key: string;
  original_filename: string;
  focal_x: number | null;
  focal_y: number | null;
};

function supabaseHeaders(env: MediaProcessorEnv, prefer?: string) {
  return {
    Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
    apikey: env.SUPABASE_SECRET_KEY,
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

async function supabaseRows<T>(env: MediaProcessorEnv, path: string): Promise<T[]> {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, { headers: supabaseHeaders(env) });
  if (!response.ok) throw new Error(`Database read failed (${response.status}).`);
  return response.json<T[]>();
}

async function supabasePatch(env: MediaProcessorEnv, table: string, filter: string, value: Record<string, unknown>) {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: "PATCH",
    headers: supabaseHeaders(env, "return=minimal"),
    body: JSON.stringify(value),
  });
  if (!response.ok) throw new Error(`Database update failed (${response.status}).`);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

async function transformAndStore(env: MediaProcessorEnv, media: MediaRow, variant: PrivateImageVariant) {
  const source = await env.CLIENT_MEDIA.get(media.private_r2_key);
  if (!source) throw new Error("Original media object is missing.");
  const settings = PRIVATE_IMAGE_VARIANTS[variant];
  const transformed = await env.IMAGES.input(source.body).transform({
    width: settings.width,
    ...("height" in settings && settings.height ? { height: settings.height } : {}),
    fit: settings.fit,
    gravity: settings.fit === "cover" ? { x: media.focal_x ?? 0.5, y: media.focal_y ?? 0.5, mode: "box-center" } : "center",
  }).output({ format: "image/webp", quality: variant === "gallery-preview" ? 88 : 82 });
  await env.CLIENT_MEDIA.put(`derivatives/${media.id}/${variant}.webp`, transformed.image(), {
    httpMetadata: { contentType: "image/webp", cacheControl: "private, no-store" },
    customMetadata: { sourceMediaAssetId: media.id, variant },
  });
}

async function storeWatermarkedPreview(env: MediaProcessorEnv, media: MediaRow, sourceWidth: number) {
  const [source, watermark] = await Promise.all([
    env.CLIENT_MEDIA.get(media.private_r2_key),
    env.PUBLIC_MEDIA.get(env.WATERMARK_R2_KEY),
  ]);
  if (!source || !watermark) throw new Error("Original or approved watermark object is missing.");
  const watermarkWidth = Math.max(180, Math.min(520, Math.round(sourceWidth * 0.22)));
  const base = env.IMAGES.input(source.body).transform({ width: 2560, fit: "scale-down" });
  const overlay = env.IMAGES.input(watermark.body).transform({ width: watermarkWidth, fit: "contain" });
  const result = await base.draw(overlay, { opacity: 0.28, right: 40, bottom: 40 }).output({ format: "image/webp", quality: 88 });
  await env.CLIENT_MEDIA.put(`derivatives/${media.id}/gallery-preview-watermarked.webp`, result.image(), {
    httpMetadata: { contentType: "image/webp", cacheControl: "private, no-store" },
    customMetadata: { sourceMediaAssetId: media.id, variant: "gallery-preview-watermarked" },
  });
}

async function processImage(env: MediaProcessorEnv, message: Extract<MediaProcessingMessage, { kind: "process-image" }>) {
  const mediaRows = await supabaseRows<MediaRow>(env, `media_assets?id=eq.${message.mediaAssetId}&select=id,client_id,private_r2_key,original_filename,focal_x,focal_y`);
  const media = mediaRows[0];
  if (!media) throw new Error("Media record is missing.");
  await supabasePatch(env, "media_processing_jobs", `id=eq.${message.jobId}`, { status: "processing", locked_at: new Date().toISOString(), locked_by: "media-processor-staging" });
  await supabasePatch(env, "media_assets", `id=eq.${media.id}`, { status: "processing", processing_failure_code: null, processing_failure_message: null });
  try {
    const infoSource = await env.CLIENT_MEDIA.get(media.private_r2_key);
    if (!infoSource) throw new Error("Original media object is missing.");
    if (infoSource.size > 20 * 1024 * 1024) throw new Error("Original exceeds the current Cloudflare Images binding input limit; provide an approved web master for processing.");
    const info = await env.IMAGES.info(infoSource.body);
    if (!("width" in info) || !("height" in info)) throw new Error("The uploaded object is not a raster image.");
    await Promise.all((Object.keys(PRIVATE_IMAGE_VARIANTS) as PrivateImageVariant[]).map((variant) => transformAndStore(env, media, variant)));
    if (message.watermark) await storeWatermarkedPreview(env, media, info.width);

    const hostedSource = await env.CLIENT_MEDIA.get(`derivatives/${media.id}/gallery-preview.webp`);
    if (!hostedSource) throw new Error("Generated preview is missing.");
    const hosted = await env.IMAGES.hosted.upload(hostedSource.body, {
      filename: `${media.id}-preview.webp`,
      requireSignedURLs: true,
      metadata: { mediaAssetId: media.id, environment: env.APP_ENV },
    });
    const now = new Date().toISOString();
    await Promise.all([
      supabasePatch(env, "media_assets", `id=eq.${media.id}`, {
        status: "ready",
        width: info.width,
        height: info.height,
        aspect_ratio: info.width / info.height,
        cloudflare_image_id: hosted.id,
        processed_at: now,
        processing_failure_code: null,
        processing_failure_message: null,
      }),
      supabasePatch(env, "gallery_assets", `media_asset_id=eq.${media.id}`, { width: info.width, height: info.height }),
      supabasePatch(env, "media_processing_jobs", `id=eq.${message.jobId}`, { status: "succeeded", finished_at: now, locked_at: null, locked_by: null, output: { cloudflareImageId: hosted.id, width: info.width, height: info.height } }),
    ]);

    const links = await supabaseRows<{ media_asset_id: string }>(env, `gallery_assets?gallery_id=eq.${message.galleryId}&select=media_asset_id`);
    const ids = links.map((link) => link.media_asset_id).filter(Boolean);
    if (ids.length) {
      const statuses = await supabaseRows<{ status: string }>(env, `media_assets?id=in.(${ids.join(",")})&select=status`);
      if (statuses.length === ids.length && statuses.every((item) => item.status === "ready")) {
        await supabasePatch(env, "galleries", `id=eq.${message.galleryId}&status=eq.processing`, { status: "ready" });
      }
    }
  } catch (error) {
    const failure = error instanceof Error ? error.message.slice(0, 1000) : "Image processing failed.";
    const now = new Date().toISOString();
    await Promise.all([
      supabasePatch(env, "media_assets", `id=eq.${media.id}`, { status: "failed", processing_failure_code: "processing_failed", processing_failure_message: failure }),
      supabasePatch(env, "media_processing_jobs", `id=eq.${message.jobId}`, { status: "failed", finished_at: now, last_error: failure, locked_at: null, locked_by: null }),
    ]);
    throw error;
  }
}

async function sendGalleryEmail(env: MediaProcessorEnv, message: Extract<MediaProcessingMessage, { kind: "gallery-email" }>) {
  const outboxRows = await supabaseRows<{ id: string; gallery_id: string; recipient_profile_id: string; status: string }>(env, `gallery_email_outbox?id=eq.${message.outboxId}&select=id,gallery_id,recipient_profile_id,status`);
  const outbox = outboxRows[0];
  if (!outbox || outbox.status === "sent" || outbox.status === "cancelled") return;
  await supabasePatch(env, "gallery_email_outbox", `id=eq.${outbox.id}`, { status: "processing", processing_at: new Date().toISOString() });
  try {
    const [profiles, galleries] = await Promise.all([
      supabaseRows<{ email: string; first_name: string }>(env, `client_profiles?id=eq.${outbox.recipient_profile_id}&select=email,first_name`),
      supabaseRows<{ id: string; title: string; project_id: string; downloads_enabled: boolean; expires_at: string | null }>(env, `galleries?id=eq.${outbox.gallery_id}&status=eq.published&select=id,title,project_id,downloads_enabled,expires_at`),
    ]);
    const profile = profiles[0];
    const gallery = galleries[0];
    if (!profile || !gallery) throw new Error("Gallery email recipient or published gallery is missing.");
    const projects = await supabaseRows<{ reference: string }>(env, `projects?id=eq.${gallery.project_id}&select=reference`);
    const reference = projects[0]?.reference ?? "your project";
    const url = `${env.PUBLIC_SITE_URL}/portal/galleries/${gallery.id}`;
    const expiryText = gallery.expires_at ? ` This gallery is available until ${new Intl.DateTimeFormat("en-PH", { dateStyle: "long", timeZone: "Asia/Manila" }).format(new Date(gallery.expires_at))}.` : "";
    const downloadText = gallery.downloads_enabled ? "Approved downloads are available in the gallery." : "Downloads are not currently enabled.";
    const subject = "Your Kahel Studio gallery is ready";
    const text = `Hi ${profile.first_name},\n\n${gallery.title} (${reference}) is ready. Sign in to your Client Portal to view it: ${url}\n\n${downloadText}${expiryText}\n\nNeed help? Reply to ${env.GALLERY_EMAIL_REPLY_TO}.`;
    const html = `<div style="margin:0;background:#FBF7F2;padding:24px;font-family:Inter,Arial,sans-serif;color:#1C1917"><div style="max-width:620px;margin:0 auto;background:#FFFFFF;padding:32px"><h1 style="margin:0;font-family:Archivo,Arial,sans-serif;font-size:30px">Your gallery is ready</h1><p style="font-size:16px;line-height:1.6">Hi ${escapeHtml(profile.first_name)},</p><p style="font-size:16px;line-height:1.6"><strong>${escapeHtml(gallery.title)}</strong> (${escapeHtml(reference)}) is ready in your secure Client Portal.</p><p style="font-size:16px;line-height:1.6">${escapeHtml(downloadText + expiryText)}</p><a href="${escapeHtml(url)}" style="display:inline-block;background:#FF5300;color:#FFFFFF;padding:14px 22px;text-decoration:none;font-size:16px;font-weight:700">View your gallery</a><p style="margin-top:28px;font-size:16px;line-height:1.6;color:#57534E">Sign-in is required. Need help? Reply to ${escapeHtml(env.GALLERY_EMAIL_REPLY_TO)}.</p></div></div>`;
    const providerId = await sendResendEmail(env.RESEND_API_KEY, {
      to: profile.email,
      from: env.GALLERY_EMAIL_FROM,
      replyTo: env.GALLERY_EMAIL_REPLY_TO,
      subject,
      text,
      html,
      idempotencyKey: `gallery-email-${outbox.id}`,
    });
    await supabasePatch(env, "gallery_email_outbox", `id=eq.${outbox.id}`, { status: "sent", sent_at: new Date().toISOString(), provider_message_id: providerId, last_error: null });
  } catch (error) {
    const failure = error instanceof Error ? error.message.slice(0, 1000) : "Gallery email failed.";
    await supabasePatch(env, "gallery_email_outbox", `id=eq.${outbox.id}`, { status: "failed", last_error: failure, processing_at: null });
    throw error;
  }
}

export default {
  async queue(batch, env) {
    for (const message of batch.messages) {
      try {
        if (message.body.kind === "process-image") await processImage(env, message.body);
        else await sendGalleryEmail(env, message.body);
        message.ack();
      } catch (error) {
        console.error(JSON.stringify({ message: "media job failed", jobKind: message.body.kind, queueMessageId: message.id, error: error instanceof Error ? error.message : String(error) }));
        message.retry({ delaySeconds: Math.min(300, 15 * 2 ** Math.max(0, message.attempts - 1)) });
      }
    }
  },
} satisfies ExportedHandler<MediaProcessorEnv, MediaProcessingMessage>;
