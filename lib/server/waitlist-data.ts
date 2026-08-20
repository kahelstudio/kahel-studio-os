import "server-only";

import { getSupabaseAdmin } from "./supabase-admin";

export type WaitlistEntry = {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  phone: string | null;
  serviceId: string | null;
  serviceName: string | null;
  preferredStart: string;
  preferredEnd: string;
  timeOfDay: string;
  notes: string | null;
  status: "waiting" | "notified" | "converted" | "expired" | "cancelled";
  notifiedAt: string | null;
  convertedBookingId: string | null;
  source: string;
};

type Row = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string | null;
  service_id: string | null;
  preferred_start: string;
  preferred_end: string;
  time_of_day: string;
  notes: string | null;
  status: string;
  notified_at: string | null;
  converted_booking_id: string | null;
  source: string;
  services: { name: string } | null;
};

export async function getWaitlistEntries(status?: string): Promise<WaitlistEntry[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getSupabaseAdmin() as any;
  let query = admin
    .from("waitlist_entries")
    .select("*, services(name)")
    .order("created_at", { ascending: false });
  if (status && status !== "all") {
    query = query.eq("status", status);
  }
  const { data, error } = await query as { data: Row[] | null; error: { message: string } | null };
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    name: r.name,
    email: r.email,
    phone: r.phone,
    serviceId: r.service_id,
    serviceName: r.services?.name ?? null,
    preferredStart: r.preferred_start,
    preferredEnd: r.preferred_end,
    timeOfDay: r.time_of_day,
    notes: r.notes,
    status: r.status as WaitlistEntry["status"],
    notifiedAt: r.notified_at,
    convertedBookingId: r.converted_booking_id,
    source: r.source,
  }));
}

// Session types a customer can pick on the public booking page. Excludes demo
// duplicates (solo, duo, express, group, theme) and internal pseudo-services
// (blocked, power-interruption, other, studio-rental) that share the same names.
const PUBLIC_SERVICE_CODES = [
  "theme-session",
  "express-session",
  "group-session",
  "duo-session",
  "solo-session",
  "mini-session",
  "baby-shower",
  "engagement-party",
  "birthday",
  "christening",
  "debut",
  "anniversary-celebration",
];

export async function getWaitlistServices(): Promise<{ id: string; code: string; name: string }[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("services")
    .select("id, code, name")
    .eq("active", true)
    .in("code", PUBLIC_SERVICE_CODES)
    .not("code", "like", "complimentary-%")
    .order("name") as { data: { id: string; code: string; name: string }[] | null; error: unknown };
  if (error) return [];
  return data ?? [];
}
