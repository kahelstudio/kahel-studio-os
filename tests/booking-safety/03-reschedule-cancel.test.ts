import { afterAll, describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { at, bookingState, concurrently, db, ensureFixtures, freshDay, isConflictError, overlappingActivePairs, record, report, reschedule, rpc, setStatus, staffBooking } from "./harness";

describe("Phase 4A — rescheduling and cancellation/release concurrency", () => {
  afterAll(() => {
    mkdirSync("docs/phase4-evidence", { recursive: true });
    writeFileSync("docs/phase4-evidence/03-reschedule-cancel.json", JSON.stringify(report, null, 1));
  });

  it("B6: rescheduling A into B's slot fails and A stays at 10:00", async () => {
    const f = await ensureFixtures(); const day = freshDay();
    const a = await staffBooking(f.services.m60, day, "10:00"); const b = await staffBooking(f.services.m60, day, "12:00");
    expect(a.error).toBeNull(); expect(b.error).toBeNull();
    const r = await reschedule(a.data!.reference, day, "12:00", f.resourceA);
    const r2 = await reschedule(a.data!.reference, day, "11:30", f.resourceA); // partial overlap
    const sa = await bookingState(a.data!.id);
    record("B6 reschedule into occupied", { exact: r.error?.code ?? "ok", partial: r2.error?.code ?? "ok", aAfter: sa });
    expect(isConflictError(r.error)).toBe(true);
    expect(isConflictError(r2.error)).toBe(true);
    expect(sa.booking?.starts_at).toBe(a.data!.starts_at);
    expect(sa.reservation?.status).toBe("booked");
    expect(Date.parse(sa.reservation!.starts_at)).toBe(Date.parse(a.data!.starts_at));
  });

  it("concurrent reschedules into one free slot: exactly one wins, losers keep their original time (2/10/30)", async () => {
    const f = await ensureFixtures();
    for (const n of [2, 10, 30]) {
      const day = freshDay();
      // n bookings spread over different days so they don't conflict with each other before the race
      const bookings: Array<{ id: string; reference: string; starts_at: string; day: string }> = [];
      for (let i = 0; i < n; i++) { const d = freshDay(); const r = await staffBooking(f.services.m60, d, "09:00"); expect(r.error).toBeNull(); bookings.push({ ...r.data!, day: d }); }
      const res = await concurrently(n, async (i) => {
        const r = await reschedule(bookings[i].reference, day, "14:00", f.resourceA);
        return r.error ? { outcome: isConflictError(r.error) ? "conflict" : "error", detail: `${r.error.code} ${r.error.message}` } : { outcome: "ok" };
      });
      let moved = 0; let intact = 0;
      for (const b of bookings) { const s = await bookingState(b.id); if (Date.parse(s.booking!.starts_at) === Date.parse(at(day, "14:00"))) moved++; else if (Date.parse(s.booking!.starts_at) === Date.parse(b.starts_at) && s.reservation?.status === "booked") intact++; }
      record(`concurrent reschedule n=${n}`, { ...res, values: undefined, movedInDb: moved, intactAtOriginal: intact });
      expect(res.ok).toBe(1); expect(moved).toBe(1); expect(intact).toBe(n - 1);
    }
  });

  it("cancellation releases the slot exactly once; concurrent cancel + reschedule + status change stay consistent (20 rounds)", async () => {
    const f = await ensureFixtures();
    const outcomes: Record<string, number> = {};
    for (let i = 0; i < 20; i++) {
      const day = freshDay(); const b = await staffBooking(f.services.m60, day, "10:00");
      const [cancel, move, confirm] = await Promise.all([
        setStatus(b.data!.reference, "cancelled"),
        reschedule(b.data!.reference, day, "15:00", f.resourceA),
        setStatus(b.data!.reference, "confirmed"),
      ]);
      const s = await bookingState(b.data!.id);
      const consistent = s.booking!.status === "cancelled" ? s.reservation?.status === "released" : s.reservation?.status === "booked" && Date.parse(s.reservation!.starts_at) === Date.parse(s.booking!.starts_at);
      const key = `cancel:${cancel.error?.code ?? "ok"} move:${move.error?.code ?? "ok"} confirm:${confirm.error?.code ?? "ok"} → ${s.booking!.status}/${s.reservation?.status} consistent=${consistent}`;
      outcomes[key] = (outcomes[key] ?? 0) + 1;
      // a cancelled booking must not keep blocking: the slot is immediately bookable again
      if (s.booking!.status === "cancelled") {
        const again = await staffBooking(f.services.m60, day, "10:00");
        const again15 = await staffBooking(f.services.m60, day, "15:00");
        outcomes[`slot reusable after cancel: 10:00 ${again.error ? "NO" : "yes"}, 15:00 ${again15.error ? "NO" : "yes"}`] = (outcomes[`slot reusable after cancel: 10:00 ${again.error ? "NO" : "yes"}, 15:00 ${again15.error ? "NO" : "yes"}`] ?? 0) + 1;
      }
    }
    record("cancel/reschedule/confirm race (20 rounds)", outcomes);
    for (const k of Object.keys(outcomes)) if (k.includes("consistent=")) expect(k, k).toContain("consistent=true");
    for (const k of Object.keys(outcomes)) if (k.startsWith("slot reusable")) expect(k).not.toContain("NO");
  });

  it("double release: cancelling twice and releasing an already released hold are no-ops", async () => {
    const f = await ensureFixtures(); const day = freshDay();
    const b = await staffBooking(f.services.m60, day, "16:00");
    const c1 = await setStatus(b.data!.reference, "cancelled"); const c2 = await setStatus(b.data!.reference, "cancelled");
    const s = await bookingState(b.data!.id);
    const events = await db().from("booking_reservation_events").select("event_type").eq("booking_id", b.data!.id);
    record("double cancel", { first: c1.error?.code ?? "ok", second: c2.error?.code ?? "ok", state: s, reservationEvents: events.data?.map((e) => (e as { event_type: string }).event_type) });
    expect(s.reservation?.status).toBe("released");
  });

  it("re-activating a cancelled booking re-checks the slot (cannot silently double-book)", async () => {
    const f = await ensureFixtures(); const day = freshDay();
    const a = await staffBooking(f.services.m60, day, "11:00");
    await setStatus(a.data!.reference, "cancelled");
    const b = await staffBooking(f.services.m60, day, "11:00"); // someone else takes the freed slot
    const reactivate = await setStatus(a.data!.reference, "confirmed");
    const pairs = await overlappingActivePairs([f.resourceA]);
    record("reactivate cancelled booking after slot reused", { secondBooking: b.error?.code ?? "ok", reactivate: reactivate.error ? `${reactivate.error.code} ${reactivate.error.message}` : "ok", overlappingPairs: pairs, a: await bookingState(a.data!.id) });
    expect(reactivate.error).not.toBeNull();
    expect(pairs).toBe(0);
  });

  it("B1 over everything (resource A)", async () => {
    const f = await ensureFixtures();
    const pairs = await overlappingActivePairs([f.resourceA, f.resourceB]);
    record("B1 overlapping active pairs after reschedule/cancel tests", pairs);
    expect(pairs).toBe(0);
    void rpc;
  });
});
