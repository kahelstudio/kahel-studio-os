import "server-only";

import { getSupabaseAdmin } from "./supabase-admin";

// Phase 4B: native resource scheduling (studio, photographers, videographers, equipment, rentals).
// All scheduling data is reached through RPCs; the booking_* tables stay RPC-only for the service role.

export type ResourceType = { code: string; name: string; isPerson: boolean };
export type BookingResource = { id: string; code: string; name: string; type: string; typeName: string; active: boolean; publicSelectable: boolean; staffUserId: string | null; sortOrder: number; hours: Array<{ day: number; opens: string; closes: string }> };
export type ResourceCalendarItem =
  | { kind: "booking" | "hold"; reservationId: string; resourceId: string; startsAt: string; endsAt: string; status: string; reference: string | null; service: string | null; clientName: string | null; bookingStatus: string | null }
  | { kind: "block"; blockId: string; resourceId: string; startsAt: string; endsAt: string; blockKind: string; reason: string };
export type BookingResourceOption = { position: number; mode: "fixed" | "any_available"; type: string; typeName: string; assignedResourceId: string | null; candidates: Array<{ id: string; name: string; unavailableReason: string | null }> };
export type ServiceRequirement = { serviceId: string; position: number; mode: "fixed" | "any_available"; resourceId: string | null; resourceType: string | null; customerSelectable: boolean };

type RpcResult<T> = { data: T | null; error: { message: string; code?: string } | null };
function rpc<T>(name: string, args: Record<string, unknown>): Promise<RpcResult<T>> {
  const admin = getSupabaseAdmin();
  // bound call: supabase-js `rpc` reads `this.rest` (see Phase 4A finding B-1)
  return (admin.rpc.bind(admin) as unknown as (fn: string, params: Record<string, unknown>) => Promise<RpcResult<T>>)(name, args);
}
function unwrap<T>(result: RpcResult<T>): T {
  if (result.error) throw Object.assign(new Error(result.error.message), { code: result.error.code });
  return result.data as T;
}

/** Human message for scheduling errors returned by the database. */
export function schedulingErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/reserved|no longer available|conflicts with an existing reservation|unavailable: reserved/.test(message)) return "That resource is already booked at this time.";
  if (/leave/.test(message)) return "That staff member is on leave at this time.";
  if (/blocked|blackout/.test(message)) return "That resource is blocked at this time.";
  if (/outside_hours|not allowed|business hours/.test(message)) return "That resource does not work at this time.";
  if (/does not satisfy|not allowed|selection/.test(message)) return "That resource cannot be used for this requirement.";
  return message;
}

export async function getResourceCalendar(startsAt: string, endsAt: string, resourceIds: string[] | null = null) {
  type Raw = { resources: Array<{ id: string; code: string; name: string; type: string; type_name: string; active: boolean; staff_user_id: string | null }>; items: Array<Record<string, string | null>> };
  const data = unwrap(await rpc<Raw>("get_resource_calendar", { requested_starts_at: startsAt, requested_ends_at: endsAt, requested_resource_ids: resourceIds }));
  return {
    resources: data.resources.map((r) => ({ id: r.id, code: r.code, name: r.name, type: r.type, typeName: r.type_name, active: r.active, staffUserId: r.staff_user_id })),
    items: data.items.map((item): ResourceCalendarItem => item.kind === "block"
      ? { kind: "block", blockId: String(item.block_id), resourceId: String(item.resource_id), startsAt: String(item.starts_at), endsAt: String(item.ends_at), blockKind: String(item.block_kind), reason: String(item.reason) }
      : { kind: item.kind as "booking" | "hold", reservationId: String(item.reservation_id), resourceId: String(item.resource_id), startsAt: String(item.starts_at), endsAt: String(item.ends_at), status: String(item.status), reference: item.reference, service: item.service, clientName: item.client_name, bookingStatus: item.booking_status }),
  };
}

export async function getBookingResourceOptions(bookingId: string): Promise<BookingResourceOption[]> {
  type Raw = Array<{ position: number; mode: "fixed" | "any_available"; type: string; type_name: string; assigned_resource_id: string | null; candidates: Array<{ id: string; name: string; unavailable_reason: string | null }> }>;
  const data = unwrap(await rpc<Raw>("get_booking_resource_options", { requested_booking_id: bookingId })) ?? [];
  return data.map((o) => ({ position: o.position, mode: o.mode, type: o.type, typeName: o.type_name, assignedResourceId: o.assigned_resource_id, candidates: o.candidates.map((c) => ({ id: c.id, name: c.name, unavailableReason: c.unavailable_reason })) }));
}

export async function reassignBookingResource(bookingId: string, position: number, resourceId: string, actorId: string, reason: string) {
  return unwrap(await rpc<unknown>("reassign_booking_resource", { requested_booking_id: bookingId, requested_position: position, requested_resource_id: resourceId, requested_actor_id: actorId, requested_reason: reason }));
}

export async function upsertResource(input: { id: string | null; code: string; name: string; type: string; staffUserId: string | null; publicSelectable: boolean; active: boolean; sortOrder: number }, actorId: string) {
  return unwrap(await rpc<{ id: string }>("upsert_booking_resource", { requested_id: input.id, requested_code: input.code, requested_name: input.name, requested_type: input.type, requested_staff_user_id: input.staffUserId, requested_public_selectable: input.publicSelectable, requested_active: input.active, requested_sort_order: input.sortOrder, requested_actor_id: actorId }));
}
export async function setResourceHours(resourceId: string, hours: Array<{ day: number; opens: string; closes: string }>, actorId: string) {
  return unwrap(await rpc<unknown>("set_booking_resource_weekly_hours", { requested_resource_id: resourceId, requested_hours: hours, requested_actor_id: actorId }));
}
export async function addResourceBlock(resourceId: string, startsAt: string, endsAt: string, kind: string, reason: string, actorId: string) {
  return unwrap(await rpc<{ id: string }>("add_booking_resource_block", { requested_resource_id: resourceId, requested_starts_at: startsAt, requested_ends_at: endsAt, requested_kind: kind, requested_reason: reason, requested_actor_id: actorId, requested_external_source: null, requested_external_ref: null }));
}
export async function removeResourceBlock(blockId: string, actorId: string) {
  unwrap(await rpc<unknown>("remove_booking_resource_block", { requested_block_id: blockId, requested_actor_id: actorId }));
}
export async function setServiceRequirements(serviceId: string, requirements: Array<{ mode: "fixed" | "any_available"; resource_id?: string; resource_type?: string; customer_selectable?: boolean }>, actorId: string) {
  return unwrap(await rpc<unknown>("set_service_resource_requirements", { requested_service_id: serviceId, requested_requirements: requirements, requested_actor_id: actorId }));
}

/** Resource directory for the settings screen: types, resources (hours + upcoming blocks), service requirements. */
export async function getResourceDirectory() {
  type Raw = {
    types: Array<{ code: string; name: string; is_person: boolean }>;
    resources: Array<{ id: string; code: string; name: string; type: string; active: boolean; public_selectable: boolean; staff_user_id: string | null; sort_order: number; hours: Array<{ day: number; opens: string; closes: string }>; blocks: Array<{ id: string; starts_at: string; ends_at: string; kind: string; reason: string; external_source: string | null }> }>;
    requirements: Array<{ service_id: string; position: number; mode: "fixed" | "any_available"; resource_id: string | null; resource_type: string | null; customer_selectable: boolean }>;
  };
  const data = unwrap(await rpc<Raw>("get_resource_directory", {}));
  const admin = getSupabaseAdmin();
  const [services, staff] = await Promise.all([
    admin.from("services").select("id,code,name,duration_minutes").eq("active", true).order("name"),
    admin.from("staff_profiles").select("user_id,display_name"),
  ]);
  if (services.error) throw services.error;
  const typeNames = new Map(data.types.map((t) => [t.code, t.name]));
  return {
    types: data.types.map((t): ResourceType => ({ code: t.code, name: t.name, isPerson: t.is_person })),
    resources: data.resources.map((r) => ({ id: r.id, code: r.code, name: r.name, type: r.type, typeName: typeNames.get(r.type) ?? r.type, active: r.active, publicSelectable: r.public_selectable, staffUserId: r.staff_user_id, sortOrder: r.sort_order, hours: r.hours,
      blocks: r.blocks.map((b) => ({ id: b.id, startsAt: b.starts_at, endsAt: b.ends_at, kind: b.kind, reason: b.reason, externalSource: b.external_source })) })),
    requirements: data.requirements.map((r) => ({ serviceId: r.service_id, position: r.position, mode: r.mode, resourceId: r.resource_id, resourceType: r.resource_type, customerSelectable: r.customer_selectable })),
    services: (services.data ?? []) as Array<{ id: string; code: string; name: string; duration_minutes: number }>,
    staff: ((staff.data ?? []) as Array<{ user_id: string; display_name: string | null }>).map((s) => ({ userId: s.user_id, name: s.display_name ?? "Staff member" })),
  };
}
export type ResourceDirectory = Awaited<ReturnType<typeof getResourceDirectory>>;
