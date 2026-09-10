import { NextResponse } from "next/server";
import { getStaffPrincipal } from "@/lib/server/staff-auth";
import { hasTrustedOrigin } from "@/lib/server/customer-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { getMediaBindings, MediaInfrastructureError } from "@/lib/server/cloudflare-media";

export const runtime = "nodejs";

const BATCH_SIZE = 50;

async function secretMatches(provided: string | null, expected: string | undefined) {
  if (!provided || !expected) return false;
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const a = new Uint8Array(left);
  const b = new Uint8Array(right);
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) difference |= a[i] ^ b[i];
  return difference === 0;
}

export async function POST(request: Request) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  const scheduled = await secretMatches(bearer, process.env.MEDIA_CLEANUP_SECRET);
  const principal = scheduled ? null : await getStaffPrincipal(request);
  if (!scheduled && (!principal || !hasTrustedOrigin(request) || !["admin", "super_admin"].includes(principal.role))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();

  // Find assets due for R2 deletion
  const { data: assets, error } = await admin
    .from("media_assets")
    .select("id, private_r2_key")
    .lte("r2_delete_after", new Date().toISOString())
    .is("r2_deleted_at", null)
    .not("private_r2_key", "is", null)
    .limit(BATCH_SIZE);

  if (error) return NextResponse.json({ error: "Unable to query assets for cleanup." }, { status: 500 });
  if (!assets?.length) return NextResponse.json({ deleted: 0, message: "Nothing to clean up." }, { headers: { "Cache-Control": "no-store" } });

  let bindings: Awaited<ReturnType<typeof getMediaBindings>>;
  try {
    bindings = await getMediaBindings();
  } catch (err) {
    const message = err instanceof MediaInfrastructureError ? err.message : "Media infrastructure unavailable.";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  let deleted = 0;
  const failed: string[] = [];

  for (const asset of assets) {
    try {
      if (asset.private_r2_key) await bindings.clientMedia.delete(asset.private_r2_key);
      await (admin.from("media_assets") as ReturnType<typeof admin.from>).update({
        private_r2_key: null,
        r2_deleted_at: new Date().toISOString(),
      } as Record<string, unknown>).eq("id", asset.id);
      deleted += 1;
    } catch {
      failed.push(asset.id);
    }
  }

  return NextResponse.json(
    { deleted, failed: failed.length, remaining: assets.length - deleted },
    { headers: { "Cache-Control": "no-store" } },
  );
}
