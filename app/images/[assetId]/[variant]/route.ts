import { NextResponse } from "next/server";
import { PUBLIC_IMAGE_VARIANTS, type PublicImageVariant } from "@/lib/media-contract";
import { getMediaBindings, MediaInfrastructureError } from "@/lib/server/cloudflare-media";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VARIANTS = new Set<string>(PUBLIC_IMAGE_VARIANTS);
const TRANSFORMS: Record<PublicImageVariant, { width: number; height?: number; fit: "cover" | "scale-down" }> = {
  "hero-desktop": { width: 1920, height: 1080, fit: "cover" },
  "hero-tablet": { width: 1280, height: 960, fit: "cover" },
  "hero-mobile": { width: 828, height: 1104, fit: "cover" },
  "portfolio-large": { width: 2400, fit: "scale-down" },
  "portfolio-card": { width: 1200, height: 1500, fit: "cover" },
  "service-card": { width: 1200, height: 1500, fit: "cover" },
  "social-preview": { width: 1200, height: 630, fit: "cover" },
};

export async function GET(_request: Request, { params }: { params: Promise<{ assetId: string; variant: string }> }) {
  const { assetId, variant } = await params;
  if (!UUID.test(assetId) || !VARIANTS.has(variant)) return NextResponse.json({ error: "Image not found." }, { status: 404 });
  const result = await getSupabaseAdmin().from("media_assets").select("id,public_r2_key,cloudflare_image_id,focal_x,focal_y").eq("id", assetId).eq("visibility", "public").eq("status", "ready").maybeSingle();
  if (result.error) return NextResponse.json({ error: "Unable to load image." }, { status: 500 });
  const media = result.data;
  if (!media) return NextResponse.json({ error: "Image not found." }, { status: 404 });
  const deliveryHash = process.env.CLOUDFLARE_IMAGES_DELIVERY_HASH;
  if (media.cloudflare_image_id && deliveryHash) {
    return NextResponse.redirect(`https://imagedelivery.net/${deliveryHash}/${media.cloudflare_image_id}/${variant}`, {
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    });
  }
  if (!media.public_r2_key) return NextResponse.json({ error: "Image not found." }, { status: 404 });
  try {
    const { publicMedia, images } = await getMediaBindings();
    const source = await publicMedia.get(media.public_r2_key);
    if (!source) return NextResponse.json({ error: "Image not found." }, { status: 404 });
    const transform = TRANSFORMS[variant as PublicImageVariant];
    const output = await images.input(source.body).transform({
      width: transform.width,
      ...(transform.height ? { height: transform.height } : {}),
      fit: transform.fit,
      gravity: transform.fit === "cover" ? { x: media.focal_x ?? 0.5, y: media.focal_y ?? 0.5, mode: "box-center" } : "center",
    }).output({ format: "image/webp", quality: 85 });
    const response = output.response();
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(response.body, { headers });
  } catch (error) {
    const status = error instanceof MediaInfrastructureError ? 503 : 500;
    const detail = error instanceof MediaInfrastructureError ? error.message : "Unable to transform image.";
    return NextResponse.json({ error: detail }, { status });
  }
}
