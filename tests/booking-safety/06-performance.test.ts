import { afterAll, describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { at, freshDay, lit, pg, pgExec, record, report, reschedule, rpc, sha256, staffBooking } from "./harness";

// Phase 4B performance: availability / hold / confirmation / reschedule with 1 (legacy), 5, 20 and 100 photographers.
// Perf resources are RESOURCE-TEST-perf-*, created inactive and deactivated again afterwards.
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
async function timed<T>(fn: () => Promise<T>) { const t = performance.now(); const r = await fn(); return { r, ms: performance.now() - t }; }

describe("Phase 4B — performance", () => {
  afterAll(() => {
    pgExec(`update public.booking_resources set active = false where code like 'resource-test-perf-%'`);
    mkdirSync("docs/phase4-evidence", { recursive: true });
    writeFileSync("docs/phase4-evidence/06-performance.json", JSON.stringify(report, null, 1));
  });

  it("availability, hold, confirmation and reschedule latency vs. number of candidate resources", async () => {
    // 100 perf photographers (inactive until needed), working every day 08–20
    pgExec(`insert into public.booking_resources (code, name, type, active, sort_order)
      select 'resource-test-perf-' || lpad(g::text, 3, '0'), 'RESOURCE-TEST-perf ' || g, 'photographer', false, 1000 + g from generate_series(1, 100) g
      on conflict (code) do nothing`);
    pgExec(`insert into public.booking_resource_weekly_hours (resource_id, iso_day_of_week, opens_at, closes_at)
      select b.id, d, '08:00', '20:00' from public.booking_resources b cross join generate_series(1, 7) d where b.code like 'resource-test-perf-%'
      on conflict (resource_id, iso_day_of_week, opens_at, closes_at) do nothing`);
    pgExec(`update public.booking_resources set active = false where code in ('resource-test-luiz','resource-test-photographer-b','resource-test-freelancer-a')`);
    const photoOnly = pg<{ id: string }>(`select id from public.services where code = 'resource-test-photo-only'`)[0].id;
    const legacySolo = pg<{ id: string }>(`select id from public.services where code = 'solo'`)[0].id;
    const results: Record<string, Record<string, number>> = {};
    try {
      // baseline: legacy single-resource service (Main Studio)
      {
        const day = freshDay(); const avail: number[] = [];
        for (let i = 0; i < 7; i++) avail.push((await timed(() => rpc("get_public_service_availability", { requested_service_id: legacySolo, requested_date: day, requested_duration_minutes: null, requested_selections: null }))).ms);
        const hold = await timed(() => rpc("acquire_booking_hold", { requested_service_id: legacySolo, requested_starts_at: at(day, "10:00"), requested_idempotency_key: `SAFETY-TEST-${randomUUID()}`, requested_fingerprint: sha256(randomUUID()), requested_owner_token_hash: sha256(randomUUID()), requested_resource_id: null, requested_hold_minutes: null, requested_duration_minutes: null }));
        expect(hold.r.error).toBeNull();
        results["1 resource (legacy Main Studio)"] = { availabilityMedianMs: Math.round(median(avail)), holdMs: Math.round(hold.ms) };
      }
      for (const n of [5, 20, 100]) {
        pgExec(`update public.booking_resources set active = (sort_order - 1000) <= ${n} where code like 'resource-test-perf-%'`);
        const day = freshDay();
        // fill most photographers so the resolver has to scan (worst case: only the last one is free at 10:00)
        for (let i = 1; i < n; i++) await rpc("acquire_booking_hold_with_resources", { requested_service_id: photoOnly, requested_starts_at: at(day, "10:00"), requested_idempotency_key: `SAFETY-TEST-${randomUUID()}`, requested_fingerprint: sha256(randomUUID()), requested_owner_token_hash: sha256(randomUUID()), requested_resource_id: null, requested_hold_minutes: null, requested_duration_minutes: null, requested_resource_selections: null });
        const avail: number[] = [];
        for (let i = 0; i < 5; i++) avail.push((await timed(() => rpc("get_public_service_availability", { requested_service_id: photoOnly, requested_date: day, requested_duration_minutes: null, requested_selections: null }))).ms);
        const hold = await timed(() => rpc<{ assignments: Array<{ resource_id: string }> }>("acquire_booking_hold_with_resources", { requested_service_id: photoOnly, requested_starts_at: at(day, "10:00"), requested_idempotency_key: `SAFETY-TEST-${randomUUID()}`, requested_fingerprint: sha256(randomUUID()), requested_owner_token_hash: sha256(randomUUID()), requested_resource_id: null, requested_hold_minutes: null, requested_duration_minutes: null, requested_resource_selections: null }));
        const confirm = await timed(() => staffBooking(photoOnly, day, "14:00", { status: "confirmed" }));
        const move = await timed(() => reschedule(confirm.r.data!.reference, day, "16:00", pg<{ resource_id: string }>(`select resource_id from public.bookings where id = ${lit(confirm.r.data!.id)}`)[0].resource_id));
        expect(hold.r.error, hold.r.error?.message).toBeNull(); expect(confirm.r.error).toBeNull(); expect(move.r.error).toBeNull();
        results[`${n} photographers`] = { availabilityMedianMs: Math.round(median(avail)), holdWorstCaseMs: Math.round(hold.ms), staffBookingConfirmMs: Math.round(confirm.ms), rescheduleMs: Math.round(move.ms) };
        pgExec(`update public.bookings set status = 'cancelled', cancellation_reason = 'SAFETY-TEST perf cleanup' where id = ${lit(confirm.r.data!.id)}`);
      }
      // 100 resources of mixed types in one service (5 requirements over a 100-resource pool)
    } finally {
      pgExec(`update public.booking_resources set active = true where code in ('resource-test-luiz','resource-test-photographer-b','resource-test-freelancer-a')`);
      pgExec(`update public.booking_reservations set status = 'released', released_at = now() where status = 'held' and parent_reservation_id is null and booking_id is null and resource_id in (select id from public.booking_resources where code like 'resource-test-perf-%')`);
    }
    record("performance (local, ms; includes PostgREST round trip)", results);
    expect(results["100 photographers"].availabilityMedianMs).toBeLessThan(5000);
  });
});
