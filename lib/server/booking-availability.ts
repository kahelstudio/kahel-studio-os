import "server-only";

import { getSupabaseAdmin } from "./supabase-admin";

export const STUDIO_TIMEZONE = "Asia/Manila";

export type BookingAvailabilitySlot = {
  startsAt: string;
  endsAt: string;
  time: string;
  available: boolean;
  /** Customer-selectable resources that are free at this time, per requirement position (multi-resource services). */
  options?: Array<{ position: number; resources: Array<{ id: string; name: string }> }>;
};

/** A resource requirement of a multi-resource service (empty for legacy single-resource services). */
export type BookingRequirement = {
  position: number;
  mode: "fixed" | "any_available";
  type: string;
  typeName: string;
  customerSelectable: boolean;
  resource: { id: string; name: string } | null;
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
  requirements: BookingRequirement[];
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
  requirements?: Array<{ position: number; mode: "fixed" | "any_available"; type: string; type_name: string; customer_selectable: boolean; resource: { id: string; name: string } | null }>;
  slots: Array<{ starts_at: string; ends_at: string; available: boolean; options?: Array<{ position: number; resources: Array<{ id: string; name: string }> }> | null }>;
};

/** `{ "<requirement position>": "<resource id>" }` as sent by the booking form. */
export type ResourceSelections = Record<string, string>;
export function parseResourceSelections(value: unknown): ResourceSelections | null | "invalid" {
  if (value == null) return null;
  if (typeof value !== "object" || Array.isArray(value)) return "invalid";
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > 20) return "invalid";
  const result: ResourceSelections = {};
  for (const [position, id] of entries) {
    if (!/^(?:[1-9]|1\d|20)$/.test(position) || typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return "invalid";
    result[position] = id;
  }
  return Object.keys(result).length ? result : null;
}

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

export async function getBookingAvailability(serviceId: string, date: string, resourceId?: string | null, durationMinutes?: number | null, selections?: ResourceSelections | null): Promise<BookingAvailability> {
  const admin = getSupabaseAdmin();
  const expired = await admin.rpc("expire_booking_holds", { requested_limit: 500 });
  if (expired.error) throw expired.error;
  // Explicit resource override keeps the legacy single-resource RPC; otherwise the service-level RPC answers
  // "is the SERVICE bookable" (it delegates to the legacy RPC for services without resource requirements).
  const rpc = admin.rpc.bind(admin) as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  const result = resourceId
    ? await rpc("get_booking_availability", { requested_service_id: serviceId, requested_date: date, requested_resource_id: resourceId, requested_duration_minutes: durationMinutes ?? null })
    : await rpc("get_public_service_availability", { requested_service_id: serviceId, requested_date: date, requested_duration_minutes: durationMinutes ?? null, requested_selections: selections ?? null });
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
    requirements: (data.requirements ?? []).map((requirement) => ({
      position: requirement.position,
      mode: requirement.mode,
      type: requirement.type,
      typeName: requirement.type_name,
      customerSelectable: requirement.customer_selectable,
      resource: requirement.resource,
    })),
    slots: data.slots.map((slot) => ({
      startsAt: slot.starts_at,
      endsAt: slot.ends_at,
      time: timeFormatter.format(new Date(slot.starts_at)),
      available: slot.available,
      ...(slot.options && slot.options.length ? { options: slot.options } : {}),
    })),
  };
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
