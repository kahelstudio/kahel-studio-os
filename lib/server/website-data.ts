/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseAdmin } from "./supabase-admin";

export type PortfolioItem = {
  id: string;
  slot: string;
  title: string;
  category: string;
  consentReference: string | null;
  mediaAssetId: string | null;
  status: string;
  createdAt: string;
};

export type WebsitePage = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
};

export async function getPortfolioItems(): Promise<PortfolioItem[]> {
  try {
    const admin = getSupabaseAdmin();

    const { data, error } = await admin
      .from("website_portfolio_items")
      .select("id, slot, title, category, consent_reference, media_asset_id, status, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data ?? []).map((p: any) => ({
      id: p.id,
      slot: p.slot,
      title: p.title,
      category: p.category,
      consentReference: p.consent_reference,
      mediaAssetId: p.media_asset_id,
      status: p.status,
      createdAt: p.created_at,
    }));
  } catch (error) {
    console.error("getPortfolioItems: table not available", (error as Error).message);
    return [];
  }
}

export async function getPages(): Promise<WebsitePage[]> {
  try {
    const admin = getSupabaseAdmin();

    const { data, error } = await admin
      .from("website_portfolio_items")
      .select("id, title, status, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data ?? []).map((p: any) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      createdAt: p.created_at,
    }));
  } catch (error) {
    console.error("getPages: table not available", (error as Error).message);
    return [];
  }
}
