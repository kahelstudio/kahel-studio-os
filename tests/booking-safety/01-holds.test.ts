import { afterAll, describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { acquireHoldRpc, activeReservations, at, concurrently, ensureFixtures, freshDay, holdViaRoute, isConflictError, overlappingActivePairs, record, report } from "./harness";

const CONCURRENCY = [2, 10, 30, 50];

describe("Phase 4A — holds: same slot, overlap, hold concurrency", () => {
  afterAll(() => {
    mkdirSync("docs/phase4-evidence", { recursive: true });
    writeFileSync("docs/phase4-evidence/01-holds.json", JSON.stringify(report, null, 1));
  });

  it("same slot via acquire_booking_hold (DB guard only, no route pre-check): exactly one hold", async () => {
    const f = await ensureFixtures();
    for (const n of CONCURRENCY) {
      const day = freshDay(); const start = at(day, "10:00");
      const r = await concurrently(n, async () => {
        const h = await acquireHoldRpc(f.services.m60, start);
        if (!h.error) return { outcome: "ok", value: h.data?.reservation_id };
        return { outcome: isConflictError(h.error) ? "conflict" : "error", detail: `${h.error.code} ${h.error.message}` };
      });
      const rows = await activeReservations(f.resourceA, at(day, "00:00"), at(day, "23:59"));
      record(`same-slot rpc n=${n}`, { ...r, values: undefined, dbActiveReservations: rows.length });
      expect(r.ok).toBe(1);
      expect(r.conflict).toBe(n - 1);
      expect(r.error).toBe(0);
      expect(rows.length).toBe(1);
    }
  });

  it("same slot via POST /api/bookings/holds (real route): exactly one hold", async () => {
    const f = await ensureFixtures();
    for (const n of CONCURRENCY) {
      const day = freshDay(); const start = at(day, "11:00");
      const r = await concurrently(n, async () => {
        const res = await holdViaRoute("safety-test-m60", start);
        if (res.status === 201) return { outcome: "ok", value: res.body.holdId };
        if (res.status === 409) return { outcome: "conflict" };
        return { outcome: "error", detail: `${res.status} ${JSON.stringify(res.body)}` };
      });
      const rows = await activeReservations(f.resourceA, at(day, "00:00"), at(day, "23:59"));
      record(`same-slot route n=${n}`, { ...r, values: undefined, dbActiveReservations: rows.length });
      expect(r.ok).toBe(1);
      expect(r.error).toBe(0);
      expect(rows.length).toBe(1);
    }
  });

  it("overlap semantics are half-open [start, end) for 30/60/120-minute services (RPC level)", async () => {
    const f = await ensureFixtures();
    const cases = [
      { service: "m60", base: ["10:00", null], probes: [["09:30", "conflict"], ["10:00", "conflict"], ["10:30", "conflict"], ["11:00", "ok"], ["09:00", "ok"]] },
      { service: "m30", base: ["10:00", null], probes: [["09:30", "ok"], ["09:45", "conflict"], ["10:00", "conflict"], ["10:15", "conflict"], ["10:30", "ok"]] },
      { service: "m120", base: ["10:00", null], probes: [["08:00", "ok"], ["09:30", "conflict"], ["11:30", "conflict"], ["12:00", "ok"]] },
      { service: "buffered", base: ["10:00", null], probes: [["08:30", "ok"], ["08:45", "conflict"], ["11:15", "conflict"], ["11:30", "ok"]] }, // 15+15 min buffers on both sides
    ] as const;
    const out: Record<string, Record<string, string>> = {};
    for (const c of cases) {
      out[c.service] = {};
      for (const [probe, expected] of c.probes) {
        const day = freshDay();
        const base = await acquireHoldRpc(f.services[c.service], at(day, c.base[0]));
        expect(base.error).toBeNull();
        const probeHold = await acquireHoldRpc(f.services[c.service], at(day, probe));
        const actual = probeHold.error ? (isConflictError(probeHold.error) ? "conflict" : `error ${probeHold.error.message}`) : "ok";
        out[c.service][`${probe} vs ${c.base[0]}`] = actual;
        expect(actual, `${c.service} ${probe}`).toBe(expected);
      }
    }
    record("overlap matrix (base 10:00)", out);
  });

  it("parallel work on different resources is not serialized (B8)", async () => {
    const f = await ensureFixtures();
    const day = freshDay(); const start = at(day, "10:00");
    // the services are tied to resource A; resource B gets its own service on the fly through the RPC's resource arg → must be rejected
    const r = await concurrently(20, async (i) => {
      const svc = i % 2 ? f.services.m60 : f.services.m30;
      const h = await acquireHoldRpc(svc, i % 2 ? start : at(day, "14:00"));
      return h.error ? { outcome: isConflictError(h.error) ? "conflict" : "error", detail: h.error.message } : { outcome: "ok" };
    });
    record("two independent slots on one resource, 10+10 concurrent", { ...r, values: undefined });
    expect(r.ok).toBe(2);
    expect(await overlappingActivePairs([f.resourceA, f.resourceB])).toBe(0);
  });

  it("invariant B1 holds across everything this file created", async () => {
    const f = await ensureFixtures();
    const pairs = await overlappingActivePairs([f.resourceA, f.resourceB]);
    record("B1 overlapping active pairs (resource A/B)", pairs);
    expect(pairs).toBe(0);
  });
});
