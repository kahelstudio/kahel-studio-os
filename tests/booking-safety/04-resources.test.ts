import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { at, bookingState, concurrently, freshDay, lit, manilaDate, pg, pgExec, record, report, reschedule, rpc, setStatus, sha256, STAFF_ACTOR, staffBooking } from "./harness";

// Phase 4B — native multi-resource scheduling, exercised through the real RPCs.
// All fixtures carry the RESOURCE-TEST- prefix and live on their own resources (never the real studio).
const P = "RESOURCE-TEST-";
type Ids = Record<string, string>;
const R: Ids = {}; const S: Ids = {};

async function upsertResource(code: string, name: string, type: string, extra: { publicSelectable?: boolean; sort?: number; hours?: Array<[number, string, string]> } = {}) {
  const existing = pg<{ id: string }>(`select id from public.booking_resources where code = ${lit(code)}`)[0]?.id;
  const r = await rpc<{ id: string }>("upsert_booking_resource", { requested_id: existing ?? null, requested_code: code, requested_name: name, requested_type: type, requested_staff_user_id: null, requested_public_selectable: extra.publicSelectable ?? false, requested_active: true, requested_sort_order: extra.sort ?? 100, requested_actor_id: STAFF_ACTOR });
  if (r.error) throw new Error(r.error.message);
  const hours = (extra.hours ?? [1, 2, 3, 4, 5, 6, 7].map((d) => [d, "08:00", "18:00"] as [number, string, string])).map(([day, opens, closes]) => ({ day, opens, closes }));
  const h = await rpc("set_booking_resource_weekly_hours", { requested_resource_id: r.data!.id, requested_hours: hours, requested_actor_id: STAFF_ACTOR });
  if (h.error) throw new Error(h.error.message);
  return r.data!.id;
}
function upsertService(code: string, name: string, minutes: number, defaultResource: string) {
  return pg<{ id: string }>(`insert into public.services (code, name, duration_minutes, default_resource_id) values (${lit(code)}, ${lit(name)}, ${minutes}, ${lit(defaultResource)})
    on conflict (code) do update set name = excluded.name, duration_minutes = excluded.duration_minutes, default_resource_id = excluded.default_resource_id, active = true returning id`)[0].id;
}
async function requirements(serviceId: string, reqs: unknown[]) {
  const r = await rpc("set_service_resource_requirements", { requested_service_id: serviceId, requested_requirements: reqs, requested_actor_id: STAFF_ACTOR });
  if (r.error) throw new Error(r.error.message);
}
function hold(serviceId: string, startsAt: string, selections: Record<string, string> | null = null, duration: number | null = null) {
  const owner = randomUUID() + randomUUID();
  const key = `${P}${randomUUID()}`;
  return rpc<{ reservation_id: string; assignments: Array<{ position: number; resource_id: string }> }>("acquire_booking_hold_with_resources", {
    requested_service_id: serviceId, requested_starts_at: startsAt, requested_idempotency_key: key, requested_fingerprint: sha256(key),
    requested_owner_token_hash: sha256(owner), requested_resource_id: null, requested_hold_minutes: null, requested_duration_minutes: duration, requested_resource_selections: selections,
  }).then((r) => ({ ...r, ownerHash: sha256(owner) }));
}
const conflict = (e: { code?: string } | null) => e?.code === "23P01";
function activeOn(resourceId: string, startsAt: string, endsAt: string) {
  return pg<{ id: string; parent: string | null; status: string }>(`select id, parent_reservation_id parent, status from public.booking_reservations
    where resource_id = ${lit(resourceId)} and (status = 'booked' or (status = 'held' and expires_at > now())) and blocked_range && tstzrange(${lit(startsAt)}, ${lit(endsAt)}, '[)')`);
}
function overlappingPairs() {
  return pg<{ n: number }>(`select count(*)::int n from public.booking_reservations a join public.booking_reservations b on a.id < b.id and a.resource_id = b.resource_id and a.blocked_range && b.blocked_range
    where a.status in ('held','booked') and b.status in ('held','booked') and a.resource_id in (select id from public.booking_resources where code like 'resource-test-%')`)[0].n;
}
function nextDow(isoDow: number) { // a fresh run-unique date with the given ISO weekday (1 = Monday)
  for (;;) { const d = freshDay(); const dow = new Date(`${d}T12:00:00Z`).getUTCDay() || 7; if (dow === isoDow) return d; }
}
function availability(serviceId: string, date: string, selections: Record<string, string> | null = null, internal = false) {
  return rpc<{ slots: Array<{ starts_at: string; available: boolean; unavailable_reason: string | null; options: Array<{ position: number; resources: Array<{ id: string; name: string }> }> }>; requirements: unknown[] }>(
    "get_service_availability", { requested_service_id: serviceId, requested_date: date, requested_duration_minutes: null, requested_selections: selections, requested_include_internal: internal });
}

describe("Phase 4B — multi-resource scheduling", () => {
  beforeAll(async () => {
    // release anything left by earlier runs on RESOURCE-TEST resources (bookings first, then loose holds)
    pgExec(`update public.bookings set status = 'cancelled', cancellation_reason = 'RESOURCE-TEST cleanup' where reference like 'SAFETY-TEST-%' and status <> 'cancelled' and service_id in (select id from public.services where code like 'resource-test-%')`);
    pgExec(`update public.booking_reservations set status = 'released', released_at = now() where status in ('held','booked') and booking_id is null and parent_reservation_id is null and resource_id in (select id from public.booking_resources where code like 'resource-test-%')`);
    R.studio = await upsertResource("resource-test-main-studio", `${P}Main Studio`, "space");
    R.luiz = await upsertResource("resource-test-luiz", `${P}Luiz`, "photographer", { publicSelectable: true, sort: 10, hours: [[1, "09:00", "18:00"], [2, "09:00", "18:00"], [4, "09:00", "18:00"], [5, "09:00", "18:00"], [6, "09:00", "18:00"], [7, "09:00", "18:00"]] }); // Wednesday OFF
    R.photoB = await upsertResource("resource-test-photographer-b", `${P}Photographer B`, "photographer", { publicSelectable: true, sort: 20, hours: [1, 2, 3, 4, 5, 6, 7].map((d) => [d, "09:00", "18:00"]) });
    R.freelancer = await upsertResource("resource-test-freelancer-a", `${P}Freelancer A`, "photographer", { publicSelectable: false, sort: 30, hours: [1, 2, 3, 4, 5, 6, 7].map((d) => [d, "09:00", "18:00"]) });
    R.video = await upsertResource("resource-test-videographer", `${P}Videographer V`, "videographer");
    R.fx3 = await upsertResource("resource-test-fx3", `${P}FX3`, "camera");
    R.audio = await upsertResource("resource-test-audio-kit", `${P}Audio Kit`, "equipment");
    S.solo = upsertService("resource-test-solo-portrait", `${P}Solo Portrait`, 60, R.studio);
    S.corporate = upsertService("resource-test-corporate-interview", `${P}Corporate Interview`, 120, R.luiz);
    S.rental = upsertService("resource-test-camera-rental", `${P}Camera Rental`, 240, R.fx3);
    S.photoOnly = upsertService("resource-test-photo-only", `${P}On-location Photo`, 60, R.luiz);
    S.product = upsertService("resource-test-product-shoot", `${P}Studio Product Shoot`, 60, R.studio);
    S.photoCam = upsertService("resource-test-photo-camera", `${P}Photo + FX3`, 60, R.luiz);
    await requirements(S.solo, [{ mode: "fixed", resource_id: R.studio }, { mode: "any_available", resource_type: "photographer", customer_selectable: true }]);
    await requirements(S.corporate, [{ mode: "any_available", resource_type: "photographer" }, { mode: "any_available", resource_type: "videographer" }, { mode: "fixed", resource_id: R.fx3 }, { mode: "fixed", resource_id: R.audio }]);
    await requirements(S.rental, [{ mode: "fixed", resource_id: R.fx3 }]);
    await requirements(S.photoOnly, [{ mode: "any_available", resource_type: "photographer", customer_selectable: true }]);
    await requirements(S.product, [{ mode: "fixed", resource_id: R.studio }, { mode: "any_available", resource_type: "photographer", customer_selectable: true }, { mode: "fixed", resource_id: R.fx3 }]);
    await requirements(S.photoCam, [{ mode: "any_available", resource_type: "photographer", customer_selectable: true }, { mode: "fixed", resource_id: R.fx3 }]);
  });
  afterAll(() => {
    mkdirSync("docs/phase4-evidence", { recursive: true });
    writeFileSync("docs/phase4-evidence/04-resources.json", JSON.stringify(report, null, 1));
  });

  it("photographer availability = hours − leave − manual blocks − holds − bookings (incl. Wednesday off, full-day leave, partial day)", async () => {
    const wed = nextDow(3); const thu = nextDow(4); const fri = nextDow(5);
    // full-day leave for Luiz on `thu`, and "13:00–18:00 only" on `fri` (block 09:00–13:00)
    await rpc("add_booking_resource_block", { requested_resource_id: R.luiz, requested_starts_at: at(thu, "00:00"), requested_ends_at: at(thu, "23:59"), requested_kind: "leave", requested_reason: `${P}vacation`, requested_actor_id: STAFF_ACTOR, requested_external_source: "orangehrm", requested_external_ref: `${P}leave-${thu}` });
    const replay = await rpc<{ id: string }>("add_booking_resource_block", { requested_resource_id: R.luiz, requested_starts_at: at(thu, "00:00"), requested_ends_at: at(thu, "23:59"), requested_kind: "leave", requested_reason: `${P}vacation`, requested_actor_id: STAFF_ACTOR, requested_external_source: "orangehrm", requested_external_ref: `${P}leave-${thu}` });
    await rpc("add_booking_resource_block", { requested_resource_id: R.luiz, requested_starts_at: at(fri, "09:00"), requested_ends_at: at(fri, "13:00"), requested_kind: "manual", requested_reason: `${P}morning off`, requested_actor_id: STAFF_ACTOR });
    // a booking for Photographer B at 15:00 on fri
    await hold(S.photoOnly, at(fri, "15:00"), { "1": R.photoB });
    const luizOptions = async (date: string) => {
      const a = await availability(S.photoOnly, date);
      if (a.error) throw new Error(a.error.message);
      return a.data!.slots.filter((s) => s.available && s.options?.[0]?.resources.some((r) => r.id === R.luiz)).map((s) => new Date(s.starts_at).toISOString().slice(11, 16));
    };
    const wedLuiz = await luizOptions(wed); const thuLuiz = await luizOptions(thu); const friLuiz = await luizOptions(fri);
    const friAll = (await availability(S.photoOnly, fri)).data!.slots.filter((s) => s.available).map((s) => ({ t: new Date(s.starts_at).toISOString().slice(11, 16), names: s.options[0].resources.map((r) => r.name.replace(P, "")) }));
    const publicSees = (await rpc<{ slots: Array<{ options: Array<{ resources: Array<{ name: string }> }> }> }>("get_public_service_availability", { requested_service_id: S.photoOnly, requested_date: fri, requested_duration_minutes: null, requested_selections: null })).data!.slots.flatMap((s) => s.options.flatMap((o) => o.resources.map((r) => r.name))).filter((n, i, a) => a.indexOf(n) === i);
    record("photographer availability (UTC times; Manila = +8)", { wednesdayLuiz: wedLuiz, leaveDayLuiz: thuLuiz, partialDayLuiz: friLuiz, friAll, publicSelectableNamesOnly: publicSees, leaveProjectionIdempotent: !replay.error });
    expect(wedLuiz).toEqual([]);
    expect(thuLuiz).toEqual([]);
    expect(friLuiz[0]).toBe("05:00"); // 13:00 Manila
    expect(friLuiz).toContain("09:00"); // 17:00 Manila
    expect(publicSees).not.toContain(`${P}Freelancer A`);
  });

  it("same photographer: 30 concurrent requests for Luiz 10:00 → exactly one", async () => {
    const day = nextDow(1); const start = at(day, "10:00");
    const r = await concurrently(30, async () => { const h = await hold(S.photoOnly, start, { "1": R.luiz }); return h.error ? { outcome: conflict(h.error) ? "conflict" : "error", detail: `${h.error.code} ${h.error.message}` } : { outcome: "ok" }; });
    const luizRows = activeOn(R.luiz, start, at(day, "11:00")).length;
    record("same photographer n=30", { ...r, values: undefined, luizActiveReservations: luizRows });
    expect(r.ok).toBe(1); expect(r.error).toBe(0); expect(luizRows).toBe(1);
  });

  it("different photographers at 10:00 are both allowed when nothing else is shared", async () => {
    const day = nextDow(2); const start = at(day, "10:00");
    const [a, b] = await Promise.all([hold(S.photoOnly, start, { "1": R.luiz }), hold(S.photoOnly, start, { "1": R.photoB })]);
    record("different photographers same time", { luiz: a.error?.code ?? "ok", photographerB: b.error?.code ?? "ok" });
    expect(a.error).toBeNull(); expect(b.error).toBeNull();
  });

  it("shared studio: different photographers but one Main Studio → only one Solo Portrait", async () => {
    const day = nextDow(4); const start = at(day, "11:00");
    const r = await concurrently(20, async (i) => { const h = await hold(S.solo, start, { "2": i % 2 ? R.luiz : R.photoB }); return h.error ? { outcome: conflict(h.error) ? "conflict" : "error", detail: h.error.message } : { outcome: "ok" }; });
    const studio = activeOn(R.studio, start, at(day, "12:00")).length;
    const photographers = activeOn(R.luiz, start, at(day, "12:00")).length + activeOn(R.photoB, start, at(day, "12:00")).length;
    record("shared studio n=20 (10 Luiz + 10 B)", { ...r, values: undefined, studioRows: studio, photographerRows: photographers });
    expect(r.ok).toBe(1); expect(studio).toBe(1); expect(photographers).toBe(1);
  });

  it("multi-resource all-or-nothing: 30 × (Studio + Luiz + FX3) → one complete winner, no partial reservations", async () => {
    const day = nextDow(5); const start = at(day, "14:00"); const end = at(day, "15:00");
    const r = await concurrently(30, async () => { const h = await hold(S.product, start, { "2": R.luiz }); return h.error ? { outcome: conflict(h.error) ? "conflict" : "error", detail: h.error.message } : { outcome: "ok", value: h.data?.reservation_id }; });
    const rows = [R.studio, R.luiz, R.fx3].map((id) => activeOn(id, start, end));
    const families = new Set(rows.flat().map((x) => x.parent ?? x.id));
    record("multi-resource n=30 (Studio+Luiz+FX3)", { ...r, values: undefined, studio: rows[0].length, luiz: rows[1].length, fx3: rows[2].length, distinctFamilies: families.size });
    expect(r.ok).toBe(1); expect(r.error).toBe(0);
    expect(rows.map((x) => x.length)).toEqual([1, 1, 1]);
    expect(families.size).toBe(1);
  });

  it("deadlock/contention: 60 concurrent requests in different resource combinations", async () => {
    const day = nextDow(6); const start = at(day, "10:00"); const end = at(day, "11:00");
    const combos = [
      () => hold(S.solo, start, { "2": R.luiz }),        // Studio + Luiz
      () => hold(S.photoCam, start, { "1": R.luiz }),    // Luiz + FX3
      () => hold(S.rental, start, null, 240),            // FX3
      () => hold(S.product, start, { "2": R.photoB }),   // Studio + B + FX3
      () => hold(S.photoOnly, start, { "1": R.photoB }), // B
      () => hold(S.corporate, start),                    // any photographer + videographer + FX3 + audio
    ];
    const r = await concurrently(60, async (i) => { const h = await combos[i % combos.length](); return h.error ? { outcome: conflict(h.error) ? "conflict" : "error", detail: `${h.error.code} ${h.error.message}` } : { outcome: "ok" }; });
    const deadlocks = r.errors.filter((e) => e.startsWith("40P01")).length;
    record("contention 60 mixed combos", { ...r, values: undefined, deadlocks, overlappingPairs: overlappingPairs(), studio: activeOn(R.studio, start, end).length, luiz: activeOn(R.luiz, start, end).length, fx3: activeOn(R.fx3, at(day, "06:00"), at(day, "23:00")).length });
    expect(r.error).toBe(0); expect(deadlocks).toBe(0); expect(overlappingPairs()).toBe(0);
  });

  it("ANY_AVAILABLE assignment is deterministic (sort order), and fails cleanly when none are free", async () => {
    const day = nextDow(1); const start = at(day, "16:00");
    const got: string[] = [];
    for (let i = 0; i < 4; i++) { const h = await hold(S.photoOnly, start); got.push(h.error ? `conflict(${h.error.message})` : (h.data!.assignments[0].resource_id === R.luiz ? "Luiz" : h.data!.assignments[0].resource_id === R.photoB ? "B" : h.data!.assignments[0].resource_id === R.freelancer ? "Freelancer" : "?")); }
    record("deterministic ANY assignment, 4 sequential at one time", got);
    expect(got.slice(0, 3)).toEqual(["Luiz", "B", "Freelancer"]);
    expect(got[3]).toMatch(/^conflict/);
  });

  it("holds: expiry and release free every component", async () => {
    const day = nextDow(2); const start = at(day, "15:00"); const end = at(day, "16:00");
    const h = await hold(S.product, start, { "2": R.luiz });
    pgExec(`update public.booking_reservations set expires_at = now() - interval '1 second' where id = ${lit(h.data!.reservation_id)}`);
    await rpc("expire_booking_holds", { requested_limit: 500 });
    const afterExpiry = [R.studio, R.luiz, R.fx3].map((id) => activeOn(id, start, end).length);
    const h2 = await hold(S.product, start, { "2": R.luiz });
    const release = await rpc("release_booking_hold", { requested_reservation_id: h2.data!.reservation_id, requested_owner_token_hash: h2.ownerHash });
    const afterRelease = [R.studio, R.luiz, R.fx3].map((id) => activeOn(id, start, end).length);
    record("hold expiry/release", { afterExpiry, reacquiredAfterExpiry: !h2.error, release: release.error?.message ?? "ok", afterRelease });
    expect(afterExpiry).toEqual([0, 0, 0]); expect(h2.error).toBeNull(); expect(afterRelease).toEqual([0, 0, 0]);
  });

  it("staff bookings create components; reschedule moves all; auto-assigned photographer is swapped, chosen one is kept or the move fails", async () => {
    const day = nextDow(4);
    const b = await staffBooking(S.photoOnly, day, "09:00");
    expect(b.error).toBeNull();
    const a1 = (await rpc<Array<{ resource_name: string }>>("get_booking_resource_assignments", { requested_booking_id: b.data!.id })).data!;
    // Luiz (auto-assigned) is busy at 13:00 → reschedule must pick another photographer
    await hold(S.photoOnly, at(day, "13:00"), { "1": R.luiz });
    const move = await reschedule(b.data!.reference, day, "13:00", R.luiz);
    const s = await bookingState(b.data!.id);
    const a2 = (await rpc<Array<{ resource_name: string }>>("get_booking_resource_assignments", { requested_booking_id: b.data!.id })).data!;
    // a corporate interview (4 resources, staff-created) moved as a unit
    const corp = await staffBooking(S.corporate, day, "10:00");
    const corpMove = await reschedule(corp.data!.reference, day, "15:00", pg<{ resource_id: string }>(`select resource_id from public.bookings where id = ${lit(corp.data!.id)}`)[0].resource_id);
    const corpAssign = (await rpc<Array<{ resource_name: string; position: number }>>("get_booking_resource_assignments", { requested_booking_id: corp.data!.id })).data!;
    const corpRows = pg<{ n: number }>(`select count(*)::int n from public.booking_reservations r join public.booking_reservations a on a.id = coalesce(r.parent_reservation_id, r.id) where a.booking_id = ${lit(corp.data!.id)} and r.status = 'booked' and r.starts_at = ${lit(at(day, "15:00"))}`)[0].n;
    record("staff booking + reschedule", { assignedFirst: a1.map((x) => x.resource_name), rescheduleAnchorBusy: move.error ? `${move.error.code} ${move.error.message}` : "ok", stateAfter: s, assignedAfter: a2.map((x) => x.resource_name),
      corporate: { created: corp.error?.message ?? "ok", moved: corpMove.error?.message ?? "ok", assignments: corpAssign.map((x) => `${x.position}:${x.resource_name}`), rowsAtNewTime: corpRows } });
    expect(a1.length).toBe(1);
    expect(corpRows).toBe(4);
  });

  it("reschedule swaps an AUTO-assigned component photographer, but never a customer-chosen one", async () => {
    const day = nextDow(1);
    const auto = await staffBooking(S.solo, day, "09:00"); // studio (anchor) + auto photographer
    expect(auto.error).toBeNull();
    const assigned = (await rpc<Array<{ position: number; resource_id: string }>>("get_booking_resource_assignments", { requested_booking_id: auto.data!.id })).data!.find((x) => x.position === 2)!.resource_id;
    await hold(S.photoOnly, at(day, "14:00"), { "1": assigned }); // that photographer becomes busy at 14:00
    const moved = await reschedule(auto.data!.reference, day, "14:00", R.studio);
    const after = (await rpc<Array<{ position: number; resource_id: string }>>("get_booking_resource_assignments", { requested_booking_id: auto.data!.id })).data!.find((x) => x.position === 2)!.resource_id;
    // customer-chosen photographer (hold with selection → booking keeps selection_locked)
    const chosenHold = await hold(S.solo, at(day, "11:00"), { "2": R.photoB });
    const locked = pg<{ selection_locked: boolean }>(`select selection_locked from public.booking_reservations where parent_reservation_id = ${lit(chosenHold.data!.reservation_id)}`)[0]?.selection_locked;
    record("component auto-swap on reschedule", { rescheduleWithBusyAutoPhotographer: moved.error?.message ?? "ok", swapped: after !== assigned, customerChoiceLocked: locked });
    expect(moved.error).toBeNull(); expect(after).not.toBe(assigned); expect(locked).toBe(true);
  });

  it("staff reassignment: swap photographer; refusing a busy one keeps the original", async () => {
    const day = nextDow(5);
    const b = await staffBooking(S.solo, day, "10:00");
    expect(b.error).toBeNull();
    const before = (await rpc<Array<{ position: number; resource_id: string; resource_name: string }>>("get_booking_resource_assignments", { requested_booking_id: b.data!.id })).data!;
    const photographer = before.find((x) => x.position === 2)!;
    const other = photographer.resource_id === R.luiz ? R.photoB : R.luiz;
    const swap = await rpc("reassign_booking_resource", { requested_booking_id: b.data!.id, requested_position: 2, requested_resource_id: other, requested_actor_id: STAFF_ACTOR, requested_reason: `${P}swap` });
    // make the original photographer busy, then try to swap back → must fail and keep `other`
    await hold(S.photoOnly, at(day, "10:00"), { "1": photographer.resource_id });
    const back = await rpc("reassign_booking_resource", { requested_booking_id: b.data!.id, requested_position: 2, requested_resource_id: photographer.resource_id, requested_actor_id: STAFF_ACTOR, requested_reason: `${P}swap back` });
    const after = (await rpc<Array<{ position: number; resource_id: string }>>("get_booking_resource_assignments", { requested_booking_id: b.data!.id })).data!;
    record("staff reassignment", { swap: swap.error?.message ?? "ok", swapBackToBusy: back.error ? `${back.error.code} ${back.error.message}` : "ok", photographerAfter: after.find((x) => x.position === 2)?.resource_id === other ? "kept swapped photographer" : "CHANGED" });
    expect(swap.error).toBeNull(); expect(conflict(back.error)).toBe(true);
    expect(after.find((x) => x.position === 2)?.resource_id).toBe(other);
  });

  it("cancellation releases every component; slot reusable", async () => {
    const day = nextDow(6);
    const b = await staffBooking(S.product, day, "09:00");
    expect(b.error).toBeNull();
    await setStatus(b.data!.reference, "cancelled");
    const remaining = [R.studio, R.fx3].map((id) => activeOn(id, at(day, "09:00"), at(day, "10:00")).length);
    const again = await hold(S.product, at(day, "09:00"));
    record("cancel releases components", { remainingActive: remaining, slotReusable: !again.error });
    expect(remaining).toEqual([0, 0]); expect(again.error).toBeNull();
  });

  it("legacy services and historical bookings are untouched (no requirements → legacy path)", async () => {
    const legacy = pg<{ n: number }>(`select count(*)::int n from public.services s where not exists (select 1 from public.service_resource_requirements r where r.service_id = s.id) and s.code not like 'resource-test-%'`)[0].n;
    // invariant: a service without requirements never has ACTIVE component reservations (released rows may remain from
    // tests that temporarily configured a real service, e.g. 05-resource-payment on "Solo")
    const components = pg<{ n: number }>(`select count(*)::int n from public.booking_reservations r
      where r.parent_reservation_id is not null and r.status in ('held','booked')
        and not exists (select 1 from public.service_resource_requirements q where q.service_id = r.service_id)`)[0].n;
    const day = freshDay();
    const legacyHold = await rpc<{ reservation_id: string }>("acquire_booking_hold", { requested_service_id: pg<{ id: string }>(`select id from public.services where code = 'solo'`)[0].id, requested_starts_at: at(day, "10:00"), requested_idempotency_key: `SAFETY-TEST-${randomUUID()}`, requested_fingerprint: sha256(randomUUID()), requested_owner_token_hash: sha256(randomUUID()), requested_resource_id: null, requested_hold_minutes: null, requested_duration_minutes: null });
    record("backward compatibility", { servicesWithoutRequirements: legacy, componentRowsOnLegacyServices: components, legacyHoldViaOldRpc: legacyHold.error?.message ?? "ok" });
    expect(components).toBe(0); expect(legacyHold.error).toBeNull();
    void manilaDate;
  });

  it("B1 over all RESOURCE-TEST resources", () => {
    const n = overlappingPairs();
    record("B1 overlapping active pairs (RESOURCE-TEST)", n);
    expect(n).toBe(0);
  });
});
