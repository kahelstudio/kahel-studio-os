"use server";

import { revalidatePath } from "next/cache";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

type Table = "website_posts" | "website_collections" | "website_services" | "website_pages";

function slugify(title: string) {
  return title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 200);
}

export async function createContent(table: Table, title: string) {
  const slug = slugify(title) || "untitled";
  const { error } = await (getSupabaseAdmin() as any).from(table).insert({ title: title.trim().slice(0, 300), slug });
  if (error) throw new Error(error.message);
  revalidatePath("/website");
}

export async function updateContent(table: Table, id: string, fields: Record<string, unknown>) {
  const { error } = await (getSupabaseAdmin() as any).from(table).update(fields).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/website");
}

export async function setContentStatus(table: Table, id: string, status: "draft" | "published") {
  const { error } = await (getSupabaseAdmin() as any).from(table).update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/website");
}

export async function deleteContent(table: Table, id: string) {
  const { error } = await (getSupabaseAdmin() as any).from(table).delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/website");
}
