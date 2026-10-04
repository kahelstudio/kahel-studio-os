import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { at, cancelSafetyTestCheckoutBookings, checkoutViaRoute, concurrently, db, freshDay, holdViaRoute, lit, payMongo, payMongoEvent, pg, pgExec, record, report, rpc, sendWebhook, setStatus, STAFF_ACTOR } from "./harness";

// Payment retest after multi-resource scheduling, through the REAL hold / checkout / webhook routes.
// The local "Solo" service temporarily requires Main Studio + one photographer (customer-selectable); its legacy
// configuration (no requirements) is restored in afterAll.
const SESSION = "Solo";
let soloId = ""; let studioId = ""; let luiz = ""; let photoB = "";

function familyRows(bookingId: string) {
  return pg<{ resource_id: string; status: string }>(`select r.resource_id, r.status from public.booking_reservations r
    join public.booking_reservations a on a.id = coalesce(r.parent_reservation_id, r.id) where a.booking_id = ${lit(bookingId)} order by coalesce(r.requirement_position, 1)`);
}
async function securedCheckout(time: string, selections: Record<string, string>, day = freshDay()) {
  const startsAt = at(day, time);
  const hold = await holdViaRoute(SESSION, startsAt, { resourceSelections: selections });
  if (hold.status !== 201) return { hold, day, startsAt };
  const before = payMongo.checkoutsCreated;
  const co = await checkoutViaRoute({ session: SESSION, date: day, time, startsAt, holdId: String(hold.body.holdId), holdOwnerKey: hold.ownerKey });
  const booking = co.status === 200 ? (await db().from("bookings").select("id,reference").eq("reference", String(co.body.reference)).single<{ id: string; reference: string }>()).data! : null;
  const payment = booking ? (await db().from("payments").select("id,amount_centavos,provider_checkout_session_id").eq("booking_id", booking.id).single<{ id: string; amount_centavos: number; provider_checkout_session_id: string }>()).data! : null;
  return { hold, day, startsAt, co, booking, payment, checkoutsCreated: payMongo.checkoutsCreated - before };
}
const paid = (c: { booking?: { id: string; reference: string } | null; payment?: { id: string; amount_centavos: number; provider_checkout_session_id: string } | null }) =>
  payMongoEvent("checkout_session.payment.paid", { checkoutId: c.payment!.provider_checkout_session_id, paymentId: c.payment!.id, bookingId: c.booking!.id, reference: c.booking!.reference, amount: c.payment!.amount_centavos });

describe("Phase 4B — payment safety with multi-resource bookings (real routes)", () => {
  beforeAll(async () => {
    await cancelSafetyTestCheckoutBookings();
    soloId = pg<{ id: string }>(`select id from public.services where code = 'solo'`)[0].id;
    studioId = pg<{ id: string }>(`select id from public.booking_resources where code = 'main-studio'`)[0].id;
    luiz = pg<{ id: string }>(`select id from public.booking_resources where code = 'resource-test-luiz'`)[0].id;
    photoB = pg<{ id: string }>(`select id from public.booking_resources where code = 'resource-test-photographer-b'`)[0].id;
    // photographers must work Main Studio hours for this test (Mon–Sat 08–17)
    for (const id of [luiz, photoB]) await rpc("set_booking_resource_weekly_hours", { requested_resource_id: id, requested_hours: [1, 2, 3, 4, 5, 6].map((day) => ({ day, opens: "08:00", closes: "17:00" })), requested_actor_id: STAFF_ACTOR });
    pgExec(`update public.booking_resource_blackouts set active = false where resource_id in (${lit(luiz)}, ${lit(photoB)}) and active`);
    const r = await rpc("set_service_resource_requirements", { requested_service_id: soloId, requested_requirements: [{ mode: "fixed", resource_id: studioId }, { mode: "any_available", resource_type: "photographer", customer_selectable: true }], requested_actor_id: STAFF_ACTOR });
    if (r.error) throw new Error(r.error.message);
  });
  afterAll(async () => {
    await rpc("set_service_resource_requirements", { requested_service_id: soloId, requested_requirements: [], requested_actor_id: STAFF_ACTOR }); // back to legacy
    await cancelSafetyTestCheckoutBookings();
    mkdirSync("docs/phase4-evidence", { recursive: true });
    writeFileSync("docs/phase4-evidence/05-resource-payment.json", JSON.stringify(report, null, 1));
  });

  it("A: Studio + chosen photographer secured → checkout → paid → both resources booked, one payment", async () => {
    const c = await securedCheckout("10:00", { "2": luiz });
    expect(c.hold.status).toBe(201); expect(c.co?.status).toBe(200);
    const beforePaid = familyRows(c.booking!.id);
    const w = await sendWebhook(paid(c));
    const after = familyRows(c.booking!.id);
    const b = (await db().from("bookings").select("status,payment_status").eq("id", c.booking!.id).single()).data;
    record("multi A", { hold: c.hold.status, assignments: c.hold.body.assignments, checkoutsCreated: c.checkoutsCreated, beforePaid, webhook: w.status, booking: b, after });
    expect(after.map((x) => x.resource_id)).toEqual([studioId, luiz]);
    expect(after.every((x) => x.status === "booked")).toBe(true);
    expect((b as unknown as { status: string }).status).toBe("confirmed");
  });

  it("B: photographer busy (studio free) → hold refused → no checkout; never 'pay first, find resources later'", async () => {
    const day = freshDay();
    const otherCustomer = await holdViaRoute("resource-test-photo-only", at(day, "11:00"), { resourceSelections: { "1": luiz } }); // Luiz busy at 11:00
    const before = payMongo.checkoutsCreated;
    const c = await securedCheckout("11:00", { "2": luiz }, day);
    const studioRows = pg<{ n: number }>(`select count(*)::int n from public.booking_reservations where resource_id = ${lit(studioId)} and status in ('held','booked') and blocked_range && tstzrange(${lit(at(day, "11:00"))}, ${lit(at(day, "12:00"))}, '[)')`)[0].n;
    const nonPublic = await holdViaRoute(SESSION, at(day, "13:00"), { resourceSelections: { "2": pg<{ id: string }>(`select id from public.booking_resources where code = 'resource-test-freelancer-a'`)[0].id } });
    record("multi B", { otherCustomer: otherCustomer.status, holdWithBusyPhotographer: c.hold.status, checkoutsCreated: payMongo.checkoutsCreated - before, studioLeftReserved: studioRows, nonPublicSelection: nonPublic.status });
    expect(c.hold.status).toBe(409); expect(payMongo.checkoutsCreated - before).toBe(0); expect(studioRows).toBe(0);
    expect(nonPublic.status).toBe(400);
  });

  it("route race: 30 customers want Studio + Luiz at 14:00 → one hold, one studio row, one Luiz row", async () => {
    const day = freshDay(); const start = at(day, "14:00");
    const r = await concurrently(30, async () => { const h = await holdViaRoute(SESSION, start, { resourceSelections: { "2": luiz } }); return h.status === 201 ? { outcome: "ok" } : h.status === 409 ? { outcome: "conflict" } : { outcome: "error", detail: `${h.status} ${JSON.stringify(h.body)}` }; });
    const rows = (id: string) => pg<{ n: number }>(`select count(*)::int n from public.booking_reservations where resource_id = ${lit(id)} and status in ('held','booked') and blocked_range && tstzrange(${lit(start)}, ${lit(at(day, "15:00"))}, '[)')`)[0].n;
    record("multi route race n=30", { ...r, values: undefined, studio: rows(studioId), luiz: rows(luiz) });
    expect(r.ok).toBe(1); expect(r.error).toBe(0); expect(rows(studioId)).toBe(1); expect(rows(luiz)).toBe(1);
  });

  it("C/E/cancel: failed payment frees both; 10 concurrent duplicate webhooks → one effect; cancellation frees both", async () => {
    const failed = await securedCheckout("09:00", { "2": photoB });
    const f = await sendWebhook(payMongoEvent("checkout_session.payment.failed", { checkoutId: failed.payment!.provider_checkout_session_id, paymentId: failed.payment!.id, bookingId: failed.booking!.id, reference: failed.booking!.reference, amount: failed.payment!.amount_centavos }));
    const afterFail = familyRows(failed.booking!.id).map((x) => x.status);
    const dup = await securedCheckout("15:00", { "2": photoB });
    const event = paid(dup);
    const r = await concurrently(10, async () => { const w = await sendWebhook(event); return w.status === 200 ? { outcome: "ok" } : { outcome: "error", detail: String(w.status) }; });
    const payments = (await db().from("payments").select("status").eq("booking_id", dup.booking!.id)).data!;
    const projects = (await db().from("projects").select("id").eq("booking_id", dup.booking!.id)).data!;
    await setStatus(dup.booking!.reference, "cancelled");
    const afterCancel = familyRows(dup.booking!.id).map((x) => x.status);
    record("multi C/E/cancel", { failedWebhook: f.status, afterFail, duplicates: { ...r, values: undefined, payments: payments.length, paid: payments.filter((p) => (p as { status: string }).status === "paid").length, projects: projects.length }, afterCancel });
    expect(afterFail.every((s) => s === "released")).toBe(true);
    expect(payments.length).toBe(1); expect(projects.length).toBe(1);
    expect(afterCancel.every((s) => s === "released")).toBe(true);
    void randomUUID;
  });
});
