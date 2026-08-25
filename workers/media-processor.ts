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

async function supabaseRpc<T>(env: MediaProcessorEnv, name: string, value: Record<string, unknown>): Promise<T | null> {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${name}`, { method: "POST", headers: supabaseHeaders(env), body: JSON.stringify(value) });
  if (!response.ok) throw new Error(`Database function failed (${response.status}).`);
  return response.json<T | null>();
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
  const claimed = await supabaseRpc<{ id: string; claim_token: string; recipient_email: string; sender_email: string; sender_name: string | null; reply_to_email: string | null; rendered_subject: string; rendered_html: string | null; rendered_text: string | null }>(env, "transactional_email_claim", {
    requested_worker_id: `${env.APP_ENV}:media-processor`, requested_environment: env.APP_ENV, requested_provider: "resend", requested_lease: "5 minutes", requested_message_id: message.transactionalMessageId,
  });
  if (!claimed) return;
  await supabasePatch(env, "gallery_email_outbox", `id=eq.${outbox.id}`, { status: "processing", processing_at: new Date().toISOString(), attempts: 1 });
  try {
    const providerId = await sendResendEmail(env.RESEND_API_KEY, {
      to: claimed.recipient_email, from: claimed.sender_name ? `${claimed.sender_name} <${claimed.sender_email}>` : claimed.sender_email,
      replyTo: claimed.reply_to_email ?? undefined, subject: claimed.rendered_subject, text: claimed.rendered_text ?? "", html: claimed.rendered_html ?? "",
      idempotencyKey: `${env.APP_ENV}:${claimed.id}`,
    });
    await supabaseRpc(env, "transactional_email_finish", { requested_message_id: claimed.id, requested_claim_token: claimed.claim_token, requested_outcome: "provider_accepted", requested_provider_message_id: providerId, requested_response_metadata: { provider: "resend" }, requested_response_metadata_redacted: true });
    await supabasePatch(env, "gallery_email_outbox", `id=eq.${outbox.id}`, { status: "sent", sent_at: new Date().toISOString(), provider_message_id: providerId, last_error: null });
  } catch (error) {
    const failure = "Email provider request failed.";
    await supabaseRpc(env, "transactional_email_finish", { requested_message_id: claimed.id, requested_claim_token: claimed.claim_token, requested_outcome: "failed", requested_error_code: "provider_unavailable", requested_error_message: failure, requested_retryable: true, requested_response_metadata: {}, requested_response_metadata_redacted: true });
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
