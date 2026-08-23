import { getSupabaseAdmin } from "./supabase-admin";
import type { BookingStatusId } from "@/lib/sample-data";

export type RealBookingRow = {
  id: string;
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
    id: row.id,
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

export type EventCategory = "studio" | "event" | "rental" | "holiday" | "power" | "blocked" | "other";
export type CalendarEvent = { ref: string; title: string; serviceType: string; time: string; startsAt?: string; endsAt?: string; resourceName?: string; reservationKind?: "booking" | "hold" | "blackout"; category: EventCategory; draggable?: boolean };

const STUDIO_TYPES = new Set(["Theme", "Express", "Group", "Duo", "Solo", "Mini Session"]);
const EVENT_TYPES = new Set(["Baby Shower", "Engagement Party", "Birthday", "Christening", "Debut", "Anniversary Celebration"]);

function toCategory(serviceType: string): EventCategory {
  if (STUDIO_TYPES.has(serviceType)) return "studio";
  if (EVENT_TYPES.has(serviceType)) return "event";
  const lower = serviceType.toLowerCase();
  if (lower.includes("rental")) return "rental";
  if (lower.includes("holiday")) return "holiday";
  if (lower.includes("power")) return "power";
  if (lower.includes("block")) return "blocked";
  return "other";
}

export async function getCalendarEventsByDate(startDate: string, endDate: string): Promise<Record<string, CalendarEvent[]>> {
  try {
    const admin = getSupabaseAdmin();
    await admin.rpc("expire_booking_holds", { requested_limit: 500 });
    const rangeStart = `${startDate}T00:00:00+08:00`;
    const rangeEndDate = new Date(`${endDate}T00:00:00+08:00`);
    rangeEndDate.setUTCDate(rangeEndDate.getUTCDate() + 1);
    const rangeEnd = rangeEndDate.toISOString();
    const [{ data: bookingsData, error: bookingsError }, canonical] = await Promise.all([
      admin.from("bookings").select(`
        id,
        reference,
        service_type,
        service_date,
        service_time,
        starts_at,
        ends_at,
        resource_id,
        status,
        clients:client_id ( name )
      `)
        .neq("status", "cancelled")
        .neq("status", "completed")
        .lt("starts_at", rangeEnd)
        .gt("ends_at", rangeStart)
        .order("service_date", { ascending: true })
        .order("service_time", { ascending: true }),
      admin.rpc("get_booking_calendar_reservations", {
        requested_starts_at: rangeStart,
        requested_ends_at: rangeEnd,
      }),
    ]);

    if (bookingsError || canonical.error) throw bookingsError ?? canonical.error;
    const bookings = (bookingsData ?? []) as unknown as Array<{
      id: string; reference: string; service_type: string; service_date: string; service_time: string;
      starts_at: string; ends_at: string; resource_id: string; status: string; clients: { name: string } | null;
    }>;
    const resourceIds = [...new Set(bookings.map((b) => b.resource_id).filter(Boolean))];
    const resourcesResult = resourceIds.length
      ? await admin.from("booking_resources").select("id,name").in("id", resourceIds)
      : { data: [], error: null };
    if (resourcesResult.error) throw resourcesResult.error;
    const resourceNames = new Map((resourcesResult.data ?? []).map((resource) => [resource.id, resource.name]));
    const timeFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    const grouped: Record<string, CalendarEvent[]> = {};
    for (const booking of bookings) {
      grouped[booking.service_date] ??= [];
      grouped[booking.service_date].push({
        ref: booking.reference,
        title: booking.clients?.name ?? booking.reference,
        serviceType: booking.service_type,
        time: timeFormatter.format(new Date(booking.starts_at)),
        startsAt: booking.starts_at,
        endsAt: booking.ends_at,
        resourceName: resourceNames.get(booking.resource_id),
        reservationKind: "booking",
        category: toCategory(booking.service_type),
        draggable: true,
      });
    }
    const dateTimeFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    for (const item of (canonical.data as unknown as Array<{ id: string; kind: "hold" | "blackout"; starts_at: string; ends_at: string; resource_name: string; reason?: string }>)) {
      const local = Object.fromEntries(dateTimeFormatter.formatToParts(new Date(item.starts_at)).map((part) => [part.type, part.value]));
      const date = `${local.year}-${local.month}-${local.day}`;
      grouped[date] ??= [];
      grouped[date].push({
        ref: item.id,
        title: item.kind === "hold" ? "Active checkout hold" : item.reason || "Resource blackout",
        serviceType: item.resource_name,
        time: `${local.hour}:${local.minute}`,
        startsAt: item.starts_at,
        endsAt: item.ends_at,
        resourceName: item.resource_name,
        reservationKind: item.kind,
        category: "blocked",
        draggable: false,
      });
    }
    for (const events of Object.values(grouped)) events.sort((left, right) => left.time.localeCompare(right.time));
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
