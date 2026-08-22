import "server-only";

import { getSupabaseAdmin } from "./supabase-admin";

export const STUDIO_TIMEZONE = "Asia/Manila";

export type BookingAvailabilitySlot = {
  startsAt: string;
  endsAt: string;
  time: string;
  available: boolean;
};

export type BookingAvailability = {
  serviceId: string;
  resource: { id: string; code: string; name: string };
  date: string;
  timezone: string;
  durationMinutes: number;
  prepBufferMinutes: number;
  cleanupBufferMinutes: number;
  serverTime: string;
  refreshAfterSeconds: number;
  slots: BookingAvailabilitySlot[];
};

type AvailabilityRpc = {
  service_id: string;
  resource: { id: string; code: string; name: string };
  date: string;
  timezone: string;
  duration_minutes: number;
  prep_buffer_minutes: number;
  cleanup_buffer_minutes: number;
  server_time: string;
  refresh_after_seconds: number;
  slots: Array<{ starts_at: string; ends_at: string; available: boolean }>;
};

export async function resolveBookableService(service: string) {
  const admin = getSupabaseAdmin();
  const value = service.trim();
  if (!value) return null;
  if (/^[0-9a-f-]{36}$/i.test(value)) {
    const result = await admin.from("services").select("id,name").eq("id", value).eq("active", true).maybeSingle<{ id: string; name: string }>();
    if (result.error) throw result.error;
    return result.data;
  }
  const code = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const byCode = await admin.from("services").select("id,name").eq("code", code).eq("active", true).maybeSingle<{ id: string; name: string }>();
  if (byCode.error) throw byCode.error;
  if (byCode.data) return byCode.data;
  const byName = await admin.from("services").select("id,name").ilike("name", value).eq("active", true).limit(1).maybeSingle<{ id: string; name: string }>();
  if (byName.error) throw byName.error;
  return byName.data;
}

export async function getBookingAvailability(serviceId: string, date: string, resourceId?: string | null, durationMinutes?: number | null): Promise<BookingAvailability> {
  const admin = getSupabaseAdmin();
  const expired = await admin.rpc("expire_booking_holds", { requested_limit: 500 });
  if (expired.error) throw expired.error;
  const result = await admin.rpc("get_booking_availability", {
    requested_service_id: serviceId,
    requested_date: date,
    requested_resource_id: resourceId ?? null,
    requested_duration_minutes: durationMinutes ?? null,
  });
  if (result.error) throw result.error;
  const data = result.data as unknown as AvailabilityRpc;
  const timeFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: data.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return {
    serviceId: data.service_id,
    resource: data.resource,
    date: data.date,
    timezone: data.timezone,
    durationMinutes: data.duration_minutes,
    prepBufferMinutes: data.prep_buffer_minutes,
    cleanupBufferMinutes: data.cleanup_buffer_minutes,
    serverTime: data.server_time,
    refreshAfterSeconds: data.refresh_after_seconds,
    slots: data.slots.map((slot) => ({
      startsAt: slot.starts_at,
      endsAt: slot.ends_at,
      time: timeFormatter.format(new Date(slot.starts_at)),
      available: slot.available,
    })),
  };
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
