/* eslint-disable @typescript-eslint/no-explicit-any */
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

export type RevenueBar = {
  month: string;
  value: number;
};

export type LauncherSummary = {
  eventsToday: number;
  studioSessionsToday: number;
  salesMonthPhp: number;
};

const eventServices = new Set(["Baby Shower", "Engagement Party", "Birthday", "Christening", "Debut", "Anniversary Celebration"]);

function manilaDateRange() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).map((part) => [part.type, part.value]));
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const today = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const nextMonthYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const monthStartDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonthDate = `${nextMonthYear}-${String(nextMonth).padStart(2, "0")}-01`;
  const monthStartIso = new Date(`${monthStartDate}T00:00:00+08:00`).toISOString();
  const nextMonthIso = new Date(`${nextMonthDate}T00:00:00+08:00`).toISOString();
  return { today, monthStartDate, nextMonthDate, monthStartIso, nextMonthIso };
}

export async function getLauncherSummary(): Promise<LauncherSummary> {
  try {
    const admin = getSupabaseAdmin();
    const range = manilaDateRange();
    const [todayResult, monthlyBookingsResult, posResult] = await Promise.all([
      admin.from("bookings").select("service_type").eq("service_date", range.today).not("status", "in", '("cancelled","inquiry")'),
      admin.from("bookings").select("total_amount_php").gte("service_date", range.monthStartDate).lt("service_date", range.nextMonthDate).not("status", "in", '("cancelled","inquiry")'),
      admin.from("pos_sales").select("total").gte("recorded_at", range.monthStartIso).lt("recorded_at", range.nextMonthIso),
    ]);
    if (todayResult.error) throw todayResult.error;
    if (monthlyBookingsResult.error) throw monthlyBookingsResult.error;

    const eventsToday = (todayResult.data ?? []).filter((booking) => eventServices.has(booking.service_type)).length;
    const studioSessionsToday = (todayResult.data ?? []).length - eventsToday;
    const bookingSalesCentavos = (monthlyBookingsResult.data ?? []).reduce((sum, booking) => sum + (booking.total_amount_php ?? 0), 0);
    const posSalesPhp = posResult.error ? 0 : (posResult.data ?? []).reduce((sum, sale) => sum + Number(sale.total ?? 0), 0);
    return { eventsToday, studioSessionsToday, salesMonthPhp: Math.round(bookingSalesCentavos / 100 + posSalesPhp) };
  } catch (error) {
    console.error("getLauncherSummary: data unavailable", (error as Error).message);
    return { eventsToday: 0, studioSessionsToday: 0, salesMonthPhp: 0 };
  }
}

export async function getDashboardKpis(): Promise<DashboardKpis> {
  try {
    const admin = getSupabaseAdmin();
    const now = new Date();
    const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

    const { data: bookings, error: bookingError } = await admin
      .from("bookings")
      .select("total_amount_php")
      .gte("service_date", mtdStart)
      .not("status", "in", '("cancelled")');

    if (bookingError) throw bookingError;

    const revenueMtd = (bookings ?? []).reduce((s: number, b: any) => s + (b.total_amount_php ?? 0), 0);
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

    let posRevenue = 0;
    try {
      const { data: posSales, error: posError } = await admin
        .from("pos_sales")
        .select("total")
        .gte("recorded_at", mtdStart);

      if (!posError) {
        posRevenue = (posSales ?? []).reduce((s: number, p: any) => s + (Number(p.total) ?? 0), 0);
      }
    } catch {}

    return {
      revenueMtd,
      grossProfit: revenueMtd + posRevenue * 100,
      avgBookingValue,
      outstanding: bookingOutstanding + invoiceOutstanding,
    };
  } catch (error) {
    console.error("getDashboardKpis: table not available", (error as Error).message);
    return { revenueMtd: 0, grossProfit: 0, avgBookingValue: 0, outstanding: 0 };
  }
}

export async function getRevenueTrend(): Promise<{ bars: RevenueBar[]; maxValue: number }> {
  try {
    const admin = getSupabaseAdmin();
    const months: { label: string; start: string; end: string }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const lastDay = new Date(year, month + 1, 0).getDate();
      const pad = (n: number) => String(n).padStart(2, "0");
      months.push({
        label: d.toLocaleDateString("en-US", { month: "short", timeZone: "Asia/Manila" }).toUpperCase(),
        start: `${year}-${pad(month + 1)}-01`,
        end: `${year}-${pad(month + 1)}-${pad(lastDay)}`,
      });
    }

    const { data, error } = await admin
      .from("bookings")
      .select("service_date, total_amount_php")
      .gte("service_date", months[0].start)
      .lte("service_date", months[months.length - 1].end)
      .not("status", "in", '("cancelled","inquiry")');

    if (error) throw error;

    const byMonth = new Map<string, number>();
    for (const b of data ?? []) {
      const key = (b.service_date as string).slice(0, 7);
      byMonth.set(key, (byMonth.get(key) ?? 0) + (b.total_amount_php as number));
    }

    const bars: RevenueBar[] = months.map((m) => {
      const totalCentavos = byMonth.get(m.start.slice(0, 7)) ?? 0;
      return { month: m.label, value: Math.round(totalCentavos / 100000) };
    });

    return { bars, maxValue: Math.max(1, ...bars.map((b) => b.value)) };
  } catch (error) {
    console.error("getRevenueTrend: data unavailable", (error as Error).message);
    return { bars: [], maxValue: 1 };
  }
}

export async function getDashboardSchedule(): Promise<DashboardScheduleItem[]> {
  try {
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
  } catch (error) {
    console.error("getDashboardSchedule: table not available", (error as Error).message);
    return [];
  }
}

export async function getDashboardBalances(): Promise<DashboardBalanceItem[]> {
  try {
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
  } catch (error) {
    console.error("getDashboardBalances: table not available", (error as Error).message);
    return [];
  }
}

export async function getDashboardInquiries(): Promise<DashboardInquiry[]> {
  try {
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
  } catch (error) {
    console.error("getDashboardInquiries: table not available", (error as Error).message);
    return [];
  }
}
