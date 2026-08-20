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

export type CmsPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  status: string;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
};

export type CmsCollection = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: string;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
};

export type CmsService = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  priceLabel: string | null;
  sortOrder: number;
  status: string;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
};

export type CmsPage = {
  id: string;
  slug: string;
  title: string;
  seoDescription: string | null;
  status: string;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
};

export async function getPortfolioItems(): Promise<PortfolioItem[]> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("website_portfolio_items")
      .select("id, slot, title, category, consent_reference, media_asset_id, status, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((p: any) => ({
      id: p.id, slot: p.slot, title: p.title, category: p.category,
      consentReference: p.consent_reference, mediaAssetId: p.media_asset_id,
      status: p.status, createdAt: p.created_at,
    }));
  } catch (error) {
    console.error("getPortfolioItems:", (error as Error).message);
    return [];
  }
}

export async function getPosts(): Promise<CmsPost[]> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("website_posts")
      .select("id, slug, title, excerpt, status, published_at, updated_at, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((p: any) => ({
      id: p.id, slug: p.slug, title: p.title, excerpt: p.excerpt,
      status: p.status, publishedAt: p.published_at, updatedAt: p.updated_at, createdAt: p.created_at,
    }));
  } catch (error) {
    console.error("getPosts:", (error as Error).message);
    return [];
  }
}

export async function getCollections(): Promise<CmsCollection[]> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("website_collections")
      .select("id, slug, title, description, status, published_at, updated_at, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((c: any) => ({
      id: c.id, slug: c.slug, title: c.title, description: c.description,
      status: c.status, publishedAt: c.published_at, updatedAt: c.updated_at, createdAt: c.created_at,
    }));
  } catch (error) {
    console.error("getCollections:", (error as Error).message);
    return [];
  }
}

export async function getCmsServices(): Promise<CmsService[]> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("website_services")
      .select("id, slug, title, summary, price_label, sort_order, status, published_at, updated_at, created_at")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((s: any) => ({
      id: s.id, slug: s.slug, title: s.title, summary: s.summary,
      priceLabel: s.price_label, sortOrder: s.sort_order,
      status: s.status, publishedAt: s.published_at, updatedAt: s.updated_at, createdAt: s.created_at,
    }));
  } catch (error) {
    console.error("getCmsServices:", (error as Error).message);
    return [];
  }
}

export async function getPages(): Promise<CmsPage[]> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("website_pages")
      .select("id, slug, title, seo_description, status, published_at, updated_at, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((p: any) => ({
      id: p.id, slug: p.slug, title: p.title, seoDescription: p.seo_description,
      status: p.status, publishedAt: p.published_at, updatedAt: p.updated_at, createdAt: p.created_at,
    }));
  } catch (error) {
    console.error("getPages:", (error as Error).message);
    return [];
  }
}
