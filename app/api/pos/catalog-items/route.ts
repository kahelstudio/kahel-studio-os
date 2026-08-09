import { NextResponse } from "next/server";
import { getStaffPrincipal } from "@/lib/server/staff-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export async function GET(request: Request) {
  if (!await getStaffPrincipal(request)) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const key = new URL(request.url).searchParams.get("key")?.trim();
  if (!key) return NextResponse.json({ error: "Catalog key is required." }, { status: 400 });
  const admin = getSupabaseAdmin();
  const catalog = await admin.from("pos_catalogs").select("id").eq("catalog_key", key).maybeSingle();
  if (!catalog.data) return NextResponse.json({ items: [] });
  const items = await admin.from("pos_catalog_items").select("code,name,detail,price,quantity_info").eq("catalog_id", catalog.data.id).eq("active", true).order("sort_order");
  return NextResponse.json({ items: items.data ?? [] });
}

export async function POST(request: Request) {
  const principal = await getStaffPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (principal.role === "staff") return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const value = (key: string, max = 255) => typeof body?.[key] === "string" ? body[key].trim().slice(0, max) : "";
  const key = value("catalogKey", 48), code = value("code", 48), originalCode = value("originalCode", 48), name = value("name"), price = Number(body?.price);
  if (!key || !code || !name || !Number.isFinite(price) || price < 0) return NextResponse.json({ error: "Enter a code, name, and valid price." }, { status: 400 });
  const admin = getSupabaseAdmin();
  const catalog = await admin.from("pos_catalogs").upsert({ catalog_key: key, title: value("catalogTitle") || key, subtitle: value("catalogSubtitle", 500) || null, unit_label: value("unitLabel", 100) || null }, { onConflict: "catalog_key" }).select("id").single();
  if (catalog.error || !catalog.data) return NextResponse.json({ error: "Unable to prepare the catalog." }, { status: 500 });
  if (originalCode && originalCode !== code) {
    const renamed = await admin.from("pos_catalog_items").update({ code, name, detail: value("detail", 500) || null, price, quantity_info: value("quantityInfo", 100) || null, active: true }).eq("catalog_id", catalog.data.id).eq("code", originalCode).select("code,name,detail,price,quantity_info").maybeSingle();
    if (renamed.error) return NextResponse.json({ error: renamed.error.code === "23505" ? "That item code is already in use." : "Unable to save the catalog item." }, { status: renamed.error.code === "23505" ? 409 : 500 });
    if (renamed.data) return NextResponse.json(renamed.data);
  }
  const item = await admin.from("pos_catalog_items").upsert({ catalog_id: catalog.data.id, code, name, detail: value("detail", 500) || null, price, quantity_info: value("quantityInfo", 100) || null, active: true }, { onConflict: "catalog_id,code" }).select("code,name,detail,price,quantity_info").single();
  if (item.error || !item.data) return NextResponse.json({ error: "Unable to save the catalog item." }, { status: 500 });
  return NextResponse.json(item.data, { status: 201 });
}
