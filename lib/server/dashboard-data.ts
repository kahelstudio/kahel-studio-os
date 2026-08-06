import { getSupabaseAdmin } from "./supabase-admin";

export type DashboardKpis = {
  revenueMtd: number;
  grossProfit: number;
  avgBookingValue: number;
  outstanding: number;
};

export type DashboardScheduleItem = {
  ref: string;
  client: string;
  type: string;
  time: string;
  location: string;
  status: string;
};

export type DashboardBalanceItem = {
  ref: string;
  client: string;
  type: string;
  total: number;
  paid: number;
  balance: number;
  status: string;
};

export type DashboardInquiry = {
  id: string;
  reference: string;
  client: string;
  service_type: string;
  status: string;
  created_at: string;
};

function formatCurrency(centavos: number) {
  return `\u20B1${(centavos / 100).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export async function getDashboardKpis(): Promise<DashboardKpis> {
  const admin = getSupabaseAdmin();
  const now = new Date();
  const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

  const { data: bookings, error: bookingError } = await admin
    .from("bookings")
    .select("total_amount_php, paid_amount_php, status")
    .gte("service_date", mtdStart)
    .not("status", "in", '("cancelled")');

  if (bookingError) throw bookingError;

  const revenueMtd = (bookings ?? []).reduce((s: number, b: any) => s + (b.total_amount_php ?? 0), 0);
  const paidMtd = (bookings ?? []).reduce((s: number, b: any) => s + (b.paid_amount_php ?? 0), 0);
  const count = (bookings ?? []).length;
  const avgBookingValue = count > 0 ? Math.round(revenueMtd / count) : 0;

  const { data: outstandingBookings, error: outError } = await admin
    .from("bookings")
    .select("total_amount_php, paid_amount_php")
    .neq("payment_status", "paid")
    .not("status", "in", '("cancelled","inquiry")');

  if (outError) throw outError;

  const bookingOutstanding = (outstandingBookings ?? []).reduce(
    (s: number, b: any) => s + ((b.total_amount_php ?? 0) - (b.paid_amount_php ?? 0)),
    0,
  );

  const { data: outstandingInvoices, error: invError } = await admin
    .from("invoices")
    .select("total_amount_php, paid_amount_php")
    .neq("status", "paid");

  if (invError) throw invError;

  const invoiceOutstanding = (outstandingInvoices ?? []).reduce(
    (s: number, i: any) => s + ((i.total_amount_php ?? 0) - (i.paid_amount_php ?? 0)),
    0,
  );

  const { data: posSales, error: posError } = await admin
    .from("pos_sales")
    .select("total")
    .gte("recorded_at", mtdStart);

  if (posError) throw posError;

  const posRevenue = (posSales ?? []).reduce((s: number, p: any) => s + (Number(p.total) ?? 0), 0);

  const grossProfit = revenueMtd + posRevenue * 100;

  return {
    revenueMtd,
    grossProfit,
    avgBookingValue,
    outstanding: bookingOutstanding + invoiceOutstanding,
  };
}

export async function getDashboardSchedule(): Promise<DashboardScheduleItem[]> {
  const admin = getSupabaseAdmin();
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await admin
    .from("bookings")
    .select(`
      reference,
      service_type,
      service_time,
      location,
      status,
      clients:client_id ( name )
    `)
    .eq("service_date", today)
    .not("status", "in", '("cancelled","inquiry")')
    .order("service_time", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((b: any) => ({
    ref: b.reference,
    client: b.clients?.name ?? "Unknown",
    type: b.service_type,
    time: b.service_time?.slice(0, 5) ?? "",
    location: b.location,
    status: b.status,
  }));
}

export async function getDashboardBalances(): Promise<DashboardBalanceItem[]> {
  const admin = getSupabaseAdmin();

  const { data: bookings, error: bError } = await admin
    .from("bookings")
    .select(`
      reference,
      service_type,
      total_amount_php,
      paid_amount_php,
      payment_status,
      clients:client_id ( name )
    `)
    .not("payment_status", "eq", "paid")
    .not("status", "in", '("cancelled","inquiry")')
    .order("created_at", { ascending: false })
    .limit(50);

  if (bError) throw bError;

  const bookingBalances: DashboardBalanceItem[] = (bookings ?? []).map((b: any) => ({
    ref: b.reference,
    client: b.clients?.name ?? "Unknown",
    type: b.service_type,
    total: b.total_amount_php ?? 0,
    paid: b.paid_amount_php ?? 0,
    balance: (b.total_amount_php ?? 0) - (b.paid_amount_php ?? 0),
    status: b.payment_status,
  }));

  const { data: invoices, error: iError } = await admin
    .from("invoices")
    .select(`
      reference,
      total_amount_php,
      paid_amount_php,
      status,
      clients:client_id ( name )
    `)
    .not("status", "eq", "paid")
    .order("created_at", { ascending: false })
    .limit(50);

  if (iError) throw iError;

  const invoiceBalances: DashboardBalanceItem[] = (invoices ?? []).map((i: any) => ({
    ref: i.reference,
    client: i.clients?.name ?? "Unknown",
    type: "Invoice",
    total: i.total_amount_php ?? 0,
    paid: i.paid_amount_php ?? 0,
    balance: (i.total_amount_php ?? 0) - (i.paid_amount_php ?? 0),
    status: i.status,
  }));

  return [...bookingBalances, ...invoiceBalances]
    .sort((a, b) => b.balance - a.balance);
}

export async function getDashboardInquiries(): Promise<DashboardInquiry[]> {
  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from("bookings")
    .select(`
      id,
      reference,
      service_type,
      status,
      created_at,
      clients:client_id ( name )
    `)
    .eq("status", "inquiry")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;

  return (data ?? []).map((b: any) => ({
    id: b.id,
    reference: b.reference,
    client: b.clients?.name ?? "Unknown",
    service_type: b.service_type,
    status: b.status,
    created_at: b.created_at,
  }));
}
