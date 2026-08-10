import { NextResponse } from "next/server";
import { hasTrustedOrigin } from "@/lib/server/customer-auth";
import { getStaffPrincipal } from "@/lib/server/staff-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain"]);

export async function GET(request: Request, context: Context) {
  const principal = await getStaffPrincipal(request);
  if (!principal?.userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { id } = await context.params;
  const access = await accessible(id, principal.userId, principal.role !== "staff");
  if (!access) return NextResponse.json({ error: "Glitch not found." }, { status: 404 });
  const admin = getSupabaseAdmin();
  const attachments = await admin.from("glitch_attachments").select("id,filename,content_type,byte_size,storage_path,created_at").eq("glitch_id", id).order("created_at");
  if (attachments.error) return NextResponse.json({ error: "Unable to load attachments." }, { status: 500 });
  const rows = await Promise.all((attachments.data ?? []).map(async (item) => {
    const signed = await admin.storage.from("glitch-attachments").createSignedUrl(item.storage_path, 300);
    return { id: item.id, filename: item.filename, contentType: item.content_type, byteSize: item.byte_size, createdAt: item.created_at, url: signed.data?.signedUrl ?? null };
  }));
  return NextResponse.json(rows);
}

export async function POST(request: Request, context: Context) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const principal = await getStaffPrincipal(request);
  if (!principal?.userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { id } = await context.params;
  if (!await accessible(id, principal.userId, principal.role !== "staff")) return NextResponse.json({ error: "Glitch not found." }, { status: 404 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size < 1 || file.size > 10 * 1024 * 1024 || !allowedTypes.has(file.type)) return NextResponse.json({ error: "Use a JPEG, PNG, WebP, PDF, or text file smaller than 10 MB." }, { status: 400 });
  const filename = file.name.trim().slice(0, 255) || "attachment";
  const path = `${id}/${crypto.randomUUID()}-${filename.replace(/[^A-Za-z0-9._-]/g, "_")}`;
  const admin = getSupabaseAdmin();
  const uploaded = await admin.storage.from("glitch-attachments").upload(path, new Uint8Array(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (uploaded.error) return NextResponse.json({ error: "Unable to upload the attachment." }, { status: 500 });
  const record = await admin.from("glitch_attachments").insert({ glitch_id: id, storage_path: path, filename, content_type: file.type, byte_size: file.size, uploaded_by: principal.userId }).select("id").single();
  if (record.error || !record.data) { await admin.storage.from("glitch-attachments").remove([path]); return NextResponse.json({ error: "Unable to save the attachment." }, { status: 500 }); }
  await admin.from("glitch_activity").insert({ glitch_id: id, actor_id: principal.userId, event_type: "attachment_added", message: `Attached ${filename}.` });
  return NextResponse.json(record.data, { status: 201 });
}

async function accessible(id: string, userId: string, elevated: boolean) {
  let query = getSupabaseAdmin().from("glitches").select("id").eq("id", id).is("archived_at", null);
  if (!elevated) query = query.or(`reported_by.eq.${userId},assigned_to.eq.${userId}`);
  const result = await query.maybeSingle();
  return Boolean(result.data && !result.error);
}
