import { getSupabaseAdmin } from "./supabase-admin";

export type QuotationRow = {
  id: string;
  reference: string;
  clientId: string | null;
  client: string;
  serviceType: string;
  total: number;
  status: string;
  validUntil: string | null;
  notes: string | null;
  createdAt: string;
};

export async function getQuotations(status?: string): Promise<QuotationRow[]> {
  const admin = getSupabaseAdmin();

  let query = admin
    .from("quotations")
    .select(`
      id,
      reference,
      client_id,
      service_type,
      total,
      status,
      valid_until,
      notes,
      created_at,
      clients:client_id ( name )
    `)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query.limit(200);

  if (error) throw error;

  return (data ?? []).map((q: any) => ({
    id: q.id,
    reference: q.reference,
    clientId: q.client_id,
    client: q.clients?.name ?? "Unknown",
    serviceType: q.service_type,
    total: Number(q.total) ?? 0,
    status: q.status,
    validUntil: q.valid_until,
    notes: q.notes,
    createdAt: q.created_at,
  }));
}
