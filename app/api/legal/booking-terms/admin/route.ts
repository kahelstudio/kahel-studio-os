import { NextResponse } from "next/server";
import { getStaffPrincipal } from "@/lib/server/staff-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import type { Json } from "@/lib/server/supabase-database";

async function adminPrincipal(request: Request) {
  const principal = await getStaffPrincipal(request);
  return principal?.role === "admin" || principal?.role === "super_admin" ? principal : null;
}

export async function GET(request: Request) {
  const principal = await adminPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Administrative access is required." }, { status: 403 });
  const result = await getSupabaseAdmin().from("legal_document_versions").select("id,version_number,version_label,title,summary,effective_date,state,content,content_hash,change_summary,created_by,approved_by,approved_at,published_by,published_at,created_at,updated_at,legal_documents!inner(document_key)").eq("legal_documents.document_key", "booking_terms").order("version_number", { ascending: false });
  if (result.error) return NextResponse.json({ error: "Unable to load booking terms." }, { status: 500 });
  return NextResponse.json({ versions: result.data ?? [] });
}

export async function POST(request: Request) {
  const principal = await adminPrincipal(request);
  if (!principal?.userId) return NextResponse.json({ error: "An authenticated administrative actor is required." }, { status: 403 });
  const body = await request.json().catch(() => null) as { action?: unknown; versionId?: unknown; reason?: unknown; content?: unknown } | null;
  if (!body || typeof body.action !== "string" || typeof body.reason !== "string" || body.reason.trim().length < 3) return NextResponse.json({ error: "Action and review reason are required." }, { status: 400 });
  const admin = getSupabaseAdmin();
  let result;
  if (body.action === "create" && body.content && typeof body.content === "object") result = await admin.rpc("legal_document_create_version", { requested_document_key: "booking_terms", requested_content: body.content as Json, requested_actor_user_id: principal.userId, requested_change_summary: body.reason.trim() });
  else if (body.action === "update" && typeof body.versionId === "string" && body.content && typeof body.content === "object") result = await admin.rpc("legal_document_update_draft", { requested_version_id: body.versionId, requested_content: body.content as Json, requested_actor_user_id: principal.userId, requested_change_summary: body.reason.trim() });
  else if (["under_review", "approved", "draft"].includes(body.action) && typeof body.versionId === "string") result = await admin.rpc("legal_document_transition", { requested_version_id: body.versionId, requested_state: body.action, requested_actor_user_id: principal.userId, requested_reason: body.reason.trim() });
  else if (body.action === "publish" && typeof body.versionId === "string") result = await admin.rpc("legal_document_publish", { requested_version_id: body.versionId, requested_actor_user_id: principal.userId, requested_reason: body.reason.trim() });
  else if (body.action === "withdraw" && typeof body.versionId === "string") result = await admin.rpc("legal_document_withdraw", { requested_version_id: body.versionId, requested_actor_user_id: principal.userId, requested_reason: body.reason.trim() });
  else return NextResponse.json({ error: "Unsupported legal-document action." }, { status: 400 });
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 409 });
  return NextResponse.json({ version: result.data });
}
