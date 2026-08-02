import "server-only";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { UPLOAD_URL_TTL_SECONDS, type ApprovedImageType } from "@/lib/media-contract";

export class MediaInfrastructureError extends Error {}

export async function getMediaBindings() {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.CLIENT_MEDIA || !env.PUBLIC_MEDIA || !env.IMAGES || !env.MEDIA_PROCESSING) {
    throw new MediaInfrastructureError("Media infrastructure is unavailable in this environment.");
  }
  return {
    clientMedia: env.CLIENT_MEDIA,
    publicMedia: env.PUBLIC_MEDIA,
    images: env.IMAGES,
    processing: env.MEDIA_PROCESSING,
  };
}

export async function createDirectUploadUrl(input: { objectKey: string; contentType: ApprovedImageType; byteSize: number }) {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.CLIENT_MEDIA_BUCKET_NAME;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new MediaInfrastructureError("Direct uploads are not configured.");
  }
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  const uploadUrl = await getSignedUrl(client, new PutObjectCommand({
    Bucket: bucket,
    Key: input.objectKey,
    ContentType: input.contentType,
    ContentLength: input.byteSize,
  }), { expiresIn: UPLOAD_URL_TTL_SECONDS });
  return { uploadUrl, expiresAt: new Date(Date.now() + UPLOAD_URL_TTL_SECONDS * 1000).toISOString() };
}

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function secureTokenMatches(provided: string, expectedHash: string) {
  const providedHash = await sha256Hex(provided);
  const [providedDigest, expectedDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(providedHash)),
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(expectedHash)),
  ]);
  const a = new Uint8Array(providedDigest);
  const b = new Uint8Array(expectedDigest);
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) difference |= a[i] ^ b[i];
  return difference === 0;
}

export async function createSignedCloudflareImageUrl(imageId: string, variant: string, ttlSeconds = 300) {
  const deliveryHash = process.env.CLOUDFLARE_IMAGES_DELIVERY_HASH;
  const signingKey = process.env.IMAGES_SIGNING_KEY;
  if (!deliveryHash || !signingKey || !/^[A-Za-z0-9_-]+$/.test(imageId) || !/^[a-z0-9-]+$/.test(variant)) return null;
  const url = new URL(`https://imagedelivery.net/${deliveryHash}/${imageId}/${variant}`);
  url.searchParams.set("exp", String(Math.floor(Date.now() / 1000) + ttlSeconds));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(signingKey), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${url.pathname}?${url.searchParams.toString()}`));
  const hex = [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  url.searchParams.set("sig", hex);
  return url.toString();
}
