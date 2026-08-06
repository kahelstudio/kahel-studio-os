import { getSupabaseAdmin } from "./supabase-admin";

export type CampaignRow = {
  id: string;
  name: string;
  channel: string;
  spend: number;
  bookingsAttributed: number;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
};

export type MarketingKpis = {
  totalSpend: number;
  totalBookings: number;
  roi: number;
  activeCampaigns: number;
};

export async function getCampaigns(): Promise<CampaignRow[]> {
  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from("marketing_campaigns")
    .select("id, name, channel, spend, bookings_attributed, status, starts_at, ends_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  return (data ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    channel: c.channel,
    spend: Number(c.spend) ?? 0,
    bookingsAttributed: c.bookings_attributed,
    status: c.status,
    startsAt: c.starts_at,
    endsAt: c.ends_at,
  }));
}

export async function getMarketingKpis(): Promise<MarketingKpis> {
  const admin = getSupabaseAdmin();

  const { data: campaigns, error } = await admin
    .from("marketing_campaigns")
    .select("spend, bookings_attributed, status");

  if (error) throw error;

  const totalSpend = (campaigns ?? []).reduce((s: number, c: any) => s + (Number(c.spend) ?? 0), 0);
  const totalBookings = (campaigns ?? []).reduce((s: number, c: any) => s + (c.bookings_attributed ?? 0), 0);
  const roi = totalSpend > 0 ? Math.round((totalBookings / totalSpend) * 100) : 0;
  const activeCampaigns = (campaigns ?? []).filter((c: any) => c.status === "live").length;

  return {
    totalSpend,
    totalBookings,
    roi,
    activeCampaigns,
  };
}
