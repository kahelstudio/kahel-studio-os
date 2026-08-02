export const APPROVED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type ApprovedImageType = typeof APPROVED_IMAGE_TYPES[number];

export const MAX_ORIGINAL_BYTES = 5 * 1024 * 1024 * 1024;
export const UPLOAD_URL_TTL_SECONDS = 10 * 60;

export const PRIVATE_IMAGE_VARIANTS = {
  "gallery-thumbnail": { width: 480, height: 480, fit: "cover" },
  "gallery-grid": { width: 1200, height: 1200, fit: "cover" },
  "gallery-preview": { width: 2560, fit: "scale-down" },
} as const;

export const PUBLIC_IMAGE_VARIANTS = [
  "hero-desktop",
  "hero-tablet",
  "hero-mobile",
  "portfolio-large",
  "portfolio-card",
  "service-card",
  "social-preview",
] as const;

export type PrivateImageVariant = keyof typeof PRIVATE_IMAGE_VARIANTS;
export type PublicImageVariant = typeof PUBLIC_IMAGE_VARIANTS[number];

export type MediaProcessingMessage =
  | { kind: "process-image"; jobId: string; mediaAssetId: string; galleryId: string; watermark: boolean }
  | { kind: "gallery-email"; outboxId: string };

export function isApprovedImageType(value: string): value is ApprovedImageType {
  return APPROVED_IMAGE_TYPES.includes(value as ApprovedImageType);
}

export function extensionForMimeType(mimeType: ApprovedImageType) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  return "webp";
}

export function sanitizeDownloadFilename(value: string) {
  const cleaned = value.normalize("NFKD").replace(/[^A-Za-z0-9._ -]/g, "").replace(/\s+/g, " ").trim();
  return (cleaned || "kahel-studio-image").slice(0, 180);
}

export function hasApprovedImageSignature(bytes: Uint8Array, mimeType: ApprovedImageType) {
  if (mimeType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") return bytes.length >= 8 && bytes.slice(0, 8).every((value, index) => value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index]);
  return bytes.length >= 12
    && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
}
