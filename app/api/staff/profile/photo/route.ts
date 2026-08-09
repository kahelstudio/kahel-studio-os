import { NextResponse } from "next/server";
import { getStaffPrincipal } from "@/lib/server/staff-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

const imageTypes = {
  "image/jpeg": { extension: "jpg", valid: (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  "image/png": { extension: "png", valid: (bytes: Uint8Array) => bytes.length >= 8 && bytes.slice(0, 8).every((byte, index) => byte === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index]) },
  "image/webp": { extension: "webp", valid: (bytes: Uint8Array) => bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP" },
} as const;

export async function POST(request: Request) {
  const principal = await getStaffPrincipal(request);
  if (!principal?.userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const form = await request.formData();
  const photo = form.get("photo");
  if (!(photo instanceof File)) return NextResponse.json({ error: "Choose a profile photo." }, { status: 400 });
  if (photo.size === 0 || photo.size > 3 * 1024 * 1024) return NextResponse.json({ error: "Profile photo must be smaller than 3 MB." }, { status: 400 });
  const imageType = imageTypes[photo.type as keyof typeof imageTypes];
  if (!imageType) return NextResponse.json({ error: "Use a JPEG, PNG, or WebP image." }, { status: 400 });

  const bytes = new Uint8Array(await photo.arrayBuffer());
  if (!imageType.valid(bytes)) return NextResponse.json({ error: "The selected file is not a valid image." }, { status: 400 });

  const admin = getSupabaseAdmin();
  const path = `${principal.userId}/${crypto.randomUUID()}.${imageType.extension}`;
  const { error: uploadError } = await admin.storage.from("staff-avatars").upload(path, bytes, { contentType: photo.type, cacheControl: "31536000", upsert: false });
  if (uploadError) return NextResponse.json({ error: "Unable to upload your profile photo." }, { status: 500 });

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(principal.userId);
  if (userError || !userData.user) {
    await admin.storage.from("staff-avatars").remove([path]);
    return NextResponse.json({ error: "Unable to update your profile photo." }, { status: 500 });
  }
  const { data: publicUrl } = admin.storage.from("staff-avatars").getPublicUrl(path);
  const oldPath = typeof userData.user.user_metadata?.avatar_path === "string" ? userData.user.user_metadata.avatar_path : null;
  const { error: updateError } = await admin.auth.admin.updateUserById(principal.userId, { user_metadata: { ...userData.user.user_metadata, avatar_url: publicUrl.publicUrl, avatar_path: path } });
  if (updateError) {
    await admin.storage.from("staff-avatars").remove([path]);
    return NextResponse.json({ error: "Unable to update your profile photo." }, { status: 500 });
  }
  if (oldPath && oldPath !== path) await admin.storage.from("staff-avatars").remove([oldPath]);
  return NextResponse.json({ avatarUrl: publicUrl.publicUrl });
}
