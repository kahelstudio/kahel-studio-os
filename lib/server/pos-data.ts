import { getSupabaseAdmin } from "./supabase-admin";

export type ProductRow = {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  swatch: string;
  active: boolean;
};

export type CatalogItem = {
  id: string;
  code: string;
  name: string;
  detail: string | null;
  price: number;
  quantityInfo: string | null;
  sortOrder: number;
};

export type CatalogRow = {
  id: string;
  catalogKey: string;
  title: string;
  subtitle: string | null;
  unitLabel: string | null;
  active: boolean;
  items: CatalogItem[];
};

export type RecentSaleItem = {
  id: string;
  description: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  productId: string | null;
};

export type RecentSaleRow = {
  id: string;
  reference: string;
  client: string | null;
  method: string;
  subtotal: number;
  total: number;
  recordedAt: string;
  items: RecentSaleItem[];
};

export async function getProducts(): Promise<ProductRow[]> {
  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from("products")
    .select("id, sku, name, category, price, stock, swatch, active")
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((p: any) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    category: p.category,
    price: Number(p.price) ?? 0,
    stock: p.stock,
    swatch: p.swatch,
    active: p.active,
  }));
}

export async function getPosCatalogs(): Promise<CatalogRow[]> {
  const admin = getSupabaseAdmin();

  const { data: catalogs, error } = await admin
    .from("pos_catalogs")
    .select("id, catalog_key, title, subtitle, unit_label, active")
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const catalogIds = (catalogs ?? []).map((c: any) => c.id);

  const { data: items, error: itemError } = await admin
    .from("pos_catalog_items")
    .select("id, catalog_id, code, name, detail, price, quantity_info, sort_order")
    .in("catalog_id", catalogIds)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (itemError) throw itemError;

  const itemMap = new Map<string, CatalogItem[]>();
  for (const item of items ?? []) {
    const list = itemMap.get(item.catalog_id) ?? [];
    list.push({
      id: item.id,
      code: item.code,
      name: item.name,
      detail: item.detail,
      price: Number(item.price) ?? 0,
      quantityInfo: item.quantity_info,
      sortOrder: item.sort_order,
    });
    itemMap.set(item.catalog_id, list);
  }

  return (catalogs ?? []).map((c: any) => ({
    id: c.id,
    catalogKey: c.catalog_key,
    title: c.title,
    subtitle: c.subtitle,
    unitLabel: c.unit_label,
    active: c.active,
    items: itemMap.get(c.id) ?? [],
  }));
}

export async function getRecentSales(): Promise<RecentSaleRow[]> {
  const admin = getSupabaseAdmin();

  const { data: sales, error } = await admin
    .from("pos_sales")
    .select(`
      id,
      reference,
      client_id,
      method,
      subtotal,
      total,
      recorded_at,
      clients:client_id ( name )
    `)
    .order("recorded_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  const saleIds = (sales ?? []).map((s: any) => s.id);

  const { data: items, error: itemError } = await admin
    .from("pos_sale_items")
    .select("id, sale_id, product_id, description, unit_price, quantity, total_price")
    .in("sale_id", saleIds)
    .order("id", { ascending: true });

  if (itemError) throw itemError;

  const itemMap = new Map<string, RecentSaleItem[]>();
  for (const item of items ?? []) {
    const list = itemMap.get(item.sale_id) ?? [];
    list.push({
      id: item.id,
      description: item.description,
      unitPrice: Number(item.unit_price) ?? 0,
      quantity: item.quantity,
      totalPrice: Number(item.total_price) ?? 0,
      productId: item.product_id,
    });
    itemMap.set(item.sale_id, list);
  }

  return (sales ?? []).map((s: any) => ({
    id: s.id,
    reference: s.reference,
    client: s.clients?.name ?? null,
    method: s.method,
    subtotal: Number(s.subtotal) ?? 0,
    total: Number(s.total) ?? 0,
    recordedAt: s.recorded_at,
    items: itemMap.get(s.id) ?? [],
  }));
}
