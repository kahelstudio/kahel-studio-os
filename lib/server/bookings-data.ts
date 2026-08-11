import { getSupabaseAdmin } from "./supabase-admin";
import type { BookingStatusId } from "@/lib/sample-data";

export type RealBookingRow = {
  ref: string;
  accountId: string;
  account: string;
  type: string;
  date: string;
  serviceDate: string;
  status: BookingStatusId;
  total: string;
  payment_status: string;
  sessionDetails?: {
    dateTime: string;
    location: string;
    sessionType: string;
  };
  payment?: {
    total: string;
    deposit: string;
    balance: string;
    depositVerificationId: string | null;
  };
  paymongo_checkout_url: string | null;
  paymongo_checkout_session_id: string | null;
};

function formatDate(date: string, time: string) {
  const d = new Date(`${date}T${time}`);
  return d.toLocaleDateString("en-PH", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateLong(date: string, time: string) {
  const d = new Date(`${date}T${time}`);
  return d.toLocaleDateString("en-PH", { day: "numeric", month: "short", year: "numeric" }) + ` \u00b7 ${d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "numeric", hour12: true })}`;
}

function formatCurrency(centavos: number) {
  return `\u20B1${(centavos / 100).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

type BookingRow = {
  id: string;
  reference: string;
  service_type: string;
  service_date: string;
  service_time: string;
  location: string;
  status: string;
  payment_status: string;
  payment_type: string;
  subtotal_amount_php: number;
  total_amount_php: number;
  paid_amount_php: number;
  deposit_verification_id: string | null;
  paymongo_checkout_url: string | null;
  paymongo_checkout_session_id: string | null;
  client_id: string;
  clients: { id: string; name: string } | null;
};

function mapBookingRow(row: BookingRow): RealBookingRow {
  const deposit = Math.round(row.subtotal_amount_php * 0.5);
  const balance = row.subtotal_amount_php - row.paid_amount_php;
  const status = (row.status as BookingStatusId) || "inquiry";
  return {
    ref: row.reference,
    accountId: row.client_id,
    account: row.clients?.name || "Unknown",
    type: row.service_type,
    date: formatDate(row.service_date, row.service_time),
    serviceDate: row.service_date,
    status,
    total: formatCurrency(row.subtotal_amount_php),
    payment_status: row.payment_status,
    sessionDetails: {
      dateTime: formatDateLong(row.service_date, row.service_time),
      location: row.location,
      sessionType: row.service_type,
    },
    payment: {
      total: formatCurrency(row.subtotal_amount_php),
      deposit: row.payment_type === "deposit" ? formatCurrency(deposit) : formatCurrency(row.subtotal_amount_php),
      balance: formatCurrency(balance),
      depositVerificationId: row.deposit_verification_id ?? null,
    },
    paymongo_checkout_url: row.paymongo_checkout_url,
    paymongo_checkout_session_id: row.paymongo_checkout_session_id,
  };
}

function sortByUpcomingDate(a: BookingRow, b: BookingRow, today: string) {
  const aIsPast = a.service_date < today;
  const bIsPast = b.service_date < today;

  if (aIsPast !== bIsPast) return aIsPast ? 1 : -1;
  const dateComparison = a.service_date.localeCompare(b.service_date);
  if (dateComparison !== 0) return aIsPast ? -dateComparison : dateComparison;
  const timeComparison = a.service_time.localeCompare(b.service_time);
  return aIsPast ? -timeComparison : timeComparison;
}

export async function getRealBookings(): Promise<RealBookingRow[]> {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("bookings").select(`
      id,
      reference,
      service_type,
      service_date,
      service_time,
      location,
      status,
      payment_status,
      payment_type,
      subtotal_amount_php,
      total_amount_php,
      paid_amount_php,
      deposit_verification_id,
      paymongo_checkout_url,
      paymongo_checkout_session_id,
      client_id,
      clients:client_id ( id, name )
    `).order("created_at", { ascending: false }).limit(200);

    if (error) throw error;
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
    return (data as unknown as BookingRow[])
      .sort((a, b) => sortByUpcomingDate(a, b, today))
      .map(mapBookingRow);
  } catch (error) {
    console.error("getRealBookings: table not available", (error as Error).message);
    return [];
  }
}

export async function getRealBookingByRef(ref: string): Promise<RealBookingRow | null> {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("bookings").select(`
      id,
      reference,
      service_type,
      service_date,
      service_time,
      location,
      status,
      payment_status,
      payment_type,
      subtotal_amount_php,
      total_amount_php,
      paid_amount_php,
      deposit_verification_id,
      paymongo_checkout_url,
      paymongo_checkout_session_id,
      client_id,
      clients:client_id ( id, name )
    `).eq("reference", ref).maybeSingle();

    if (error || !data) return null;
    return mapBookingRow(data as unknown as BookingRow);
  } catch (error) {
    console.error("getRealBookingByRef: table not available", (error as Error).message);
    return null;
  }
}

export type CalendarEvent = { title: string; time: string; accent: "ink" | "orange" | "indigo" | "teal" };

export async function getCalendarEventsByDate(startDate: string, endDate: string): Promise<Record<string, CalendarEvent[]>> {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("bookings").select(`
      reference,
      service_type,
      service_date,
      service_time,
      status,
      clients:client_id ( name )
    `).gte("service_date", startDate).lte("service_date", endDate).order("service_date", { ascending: true }).order("service_time", { ascending: true });

    if (error) throw error;
    const bookings = data as unknown as Array<{
      reference: string; service_type: string; service_date: string; service_time: string;
      status: string; clients: { name: string } | null;
    }>;
    const accentByStatus: Record<string, CalendarEvent["accent"]> = {
      confirmed: "orange", inquiry: "ink", quoted: "indigo", progress: "teal",
      completed: "teal", cancelled: "ink",
    };
    const grouped: Record<string, CalendarEvent[]> = {};
    for (const booking of bookings) {
      grouped[booking.service_date] ??= [];
      grouped[booking.service_date].push({
        title: `${booking.clients?.name ?? booking.reference}: ${booking.service_type}`,
        time: booking.service_time.slice(0, 5),
        accent: accentByStatus[booking.status] ?? "ink",
      });
    }
    return grouped;
  } catch (error) {
    console.error("getCalendarEventsByDate: data unavailable", (error as Error).message);
    return {};
  }
}

export async function getCalendarEvents(month: number, year: number): Promise<Record<number, CalendarEvent[]>> {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-${new Date(Date.UTC(year, month, 0)).getUTCDate()}`;
  const dated = await getCalendarEventsByDate(startDate, endDate);
  const grouped: Record<number, CalendarEvent[]> = {};
  for (const [date, events] of Object.entries(dated)) {
    grouped[Number(date.slice(-2))] = events;
  }
  return grouped;
}
