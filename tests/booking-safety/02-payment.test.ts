import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { sendPaymentReceipt } from "@/lib/server/payment-receipt-email";
import { at, cancelSafetyTestCheckoutBookings, checkoutViaRoute, concurrently, db, freshDay, holdViaRoute, payMongo, payMongoEvent, pg, pgExec, lit, record, report, rpc, sendWebhook, setStatus } from "./harness";

// Website checkout runs on the real "Solo" service / Main Studio (the route hard-codes package names), on far-future
// run-unique dates. Every customer, e-mail and location carries the SAFETY-TEST- prefix.
const SESSION = "Solo";
type Booking = { id: string; reference: string; status: string; payment_status: string; paymongo_checkout_session_id: string | null; resource_id: string; starts_at: string };

async function bookingByReference(reference: string) {
  const r = await db().from("bookings").select("id,reference,status,payment_status,paymongo_checkout_session_id,resource_id,starts_at").eq("reference", reference).single<Booking>();
  if (r.error) throw r.error;
  return r.data;
}
async function state(bookingId: string) {
  const [b, res, pay, proj, rec, alloc, evts] = await Promise.all([
    db().from("bookings").select("status,payment_status,paid_amount_php").eq("id", bookingId).single<{ status: string; payment_status: string; paid_amount_php: number }>(),
    Promise.resolve({ data: pg<{ status: string; type: string }>(`select status, type from public.booking_reservations where booking_id = ${lit(bookingId)}`)[0] ?? null }),
    db().from("payments").select("id,status,amount_centavos,provider_checkout_session_id").eq("booking_id", bookingId),
    db().from("projects").select("id").eq("booking_id", bookingId),
    db().from("receipts").select("id").eq("booking_id", bookingId),
    db().from("payment_allocations").select("id").eq("booking_id", bookingId),
    db().from("payment_events").select("id,event_type,event_status,provider_event_id"),
  ]);
  const payments = (pay.data ?? []) as Array<{ id: string; status: string; amount_centavos: number }>;
  return {
    booking: b.data, reservation: res.data, payments: payments.map((p) => p.status), paidPayments: payments.filter((p) => p.status === "paid").length,
    projects: proj.data?.length ?? 0, receipts: rec.data?.length ?? 0, allocations: alloc.data?.length ?? 0,
    paymentEventsForBooking: (evts.data ?? []).length >= 0 ? undefined : undefined,
  };
}
async function paymentFor(bookingId: string) {
  const r = await db().from("payments").select("id,amount_centavos,provider_checkout_session_id,status").eq("booking_id", bookingId).eq("processor", "paymongo").order("created_at", { ascending: false }).limit(1).single<{ id: string; amount_centavos: number; provider_checkout_session_id: string; status: string }>();
  if (r.error) throw r.error;
  return r.data;
}

/** hold → checkout through the real routes; returns everything needed to send webhooks. */
async function securedCheckout(time = "10:00", day = freshDay()) {
  const startsAt = at(day, time);
  const hold = await holdViaRoute(SESSION, startsAt);
  expect(hold.status, JSON.stringify(hold.body)).toBe(201);
  const before = payMongo.checkoutsCreated;
  const co = await checkoutViaRoute({ session: SESSION, date: day, time, startsAt, holdId: String(hold.body.holdId), holdOwnerKey: hold.ownerKey });
  expect(co.status, JSON.stringify(co.body)).toBe(200);
  expect(payMongo.checkoutsCreated).toBe(before + 1);
  const booking = await bookingByReference(String(co.body.reference));
  const payment = await paymentFor(booking.id);
  const profile = await db().from("bookings").select("client_profile_id").eq("id", booking.id).single<{ client_profile_id: string }>();
  await db().from("client_profiles").update({ status: "active" } as never).eq("id", profile.data!.client_profile_id);
  return { day, startsAt, hold, booking, payment };
}
const paidEvent = (c: Awaited<ReturnType<typeof securedCheckout>>, eventId?: string) =>
  payMongoEvent("checkout_session.payment.paid", { eventId, checkoutId: c.payment.provider_checkout_session_id, paymentId: c.payment.id, bookingId: c.booking.id, reference: c.booking.reference, amount: c.payment.amount_centavos });
const failEvent = (c: Awaited<ReturnType<typeof securedCheckout>>, type: "checkout_session.payment.failed" | "checkout_session.expired") =>
  payMongoEvent(type, { checkoutId: c.payment.provider_checkout_session_id, paymentId: c.payment.id, bookingId: c.booking.id, reference: c.booking.reference, amount: c.payment.amount_centavos });
const flush = () => new Promise((r) => setTimeout(r, 300)); // let after() callbacks finish

describe("Phase 4A — payment safety (real checkout + webhook routes, mocked PayMongo)", () => {
  beforeAll(async () => { payMongo.fail = false; payMongo.expiresInSeconds = 3600; await cancelSafetyTestCheckoutBookings(); });
  afterAll(async () => {
    mkdirSync("docs/phase4-evidence", { recursive: true });
    writeFileSync("docs/phase4-evidence/02-payment.json", JSON.stringify(report, null, 1));
    await cancelSafetyTestCheckoutBookings();
  });

  it("Case A: hold → checkout → paid → exactly one confirmed booking, payment, project, receipt", async () => {
    const c = await securedCheckout();
    const before = vi.mocked(sendPaymentReceipt).mock.calls.length;
    const w = await sendWebhook(paidEvent(c));
    await flush();
    const s = await state(c.booking.id);
    record("Case A", { webhook: w.status, ...s, receiptEmails: vi.mocked(sendPaymentReceipt).mock.calls.length - before });
    expect(w.status).toBe(200);
    expect(s.booking?.status).toBe("confirmed");
    expect(s.reservation?.status).toBe("booked");
    expect(s.paidPayments).toBe(1);
    expect(s.projects).toBe(1);
    expect(s.receipts).toBe(1);
  });

  it("Case B: hold acquisition fails → no checkout is created (also with a stolen/forged hold id)", async () => {
    const day = freshDay(); const time = "11:00"; const startsAt = at(day, time);
    const winner = await holdViaRoute(SESSION, startsAt);
    expect(winner.status).toBe(201);
    const loser = await holdViaRoute(SESSION, startsAt);
    const before = payMongo.checkoutsCreated;
    // a client that ignores the 409 and submits checkout with the winner's hold id but its own owner key
    const stolen = await checkoutViaRoute({ session: SESSION, date: day, time, startsAt, holdId: String(winner.body.holdId), holdOwnerKey: `SAFETY-TEST-${randomUUID()}` });
    const forged = await checkoutViaRoute({ session: SESSION, date: day, time, startsAt, holdId: randomUUID(), holdOwnerKey: `SAFETY-TEST-${randomUUID()}` });
    const bookings = await db().from("bookings").select("id").eq("starts_at", startsAt).neq("status", "cancelled");
    record("Case B", { loserHold: loser.status, stolenHoldCheckout: stolen.status, forgedHoldCheckout: forged.status, checkoutsCreated: payMongo.checkoutsCreated - before, bookingsAtSlot: bookings.data?.length });
    expect(loser.status).toBe(409);
    expect(stolen.status).toBe(409);
    expect(forged.status).toBeGreaterThanOrEqual(400);
    expect(payMongo.checkoutsCreated - before).toBe(0);
    expect(bookings.data?.length ?? 0).toBe(0);
  });

  it("Case B2: 10 concurrent double-submits of one hold → one booking, one checkout", async () => {
    const day = freshDay(); const time = "13:00"; const startsAt = at(day, time);
    const hold = await holdViaRoute(SESSION, startsAt);
    const before = payMongo.checkoutsCreated;
    const r = await concurrently(10, async () => {
      const co = await checkoutViaRoute({ session: SESSION, date: day, time, startsAt, holdId: String(hold.body.holdId), holdOwnerKey: hold.ownerKey });
      return co.status === 200 ? { outcome: "ok" } : co.status === 409 ? { outcome: "conflict" } : { outcome: "error", detail: `${co.status} ${JSON.stringify(co.body)}` };
    });
    const bookings = await db().from("bookings").select("id").eq("starts_at", startsAt).neq("status", "cancelled");
    record("Case B2", { ...r, values: undefined, checkoutsCreated: payMongo.checkoutsCreated - before, bookingsAtSlot: bookings.data?.length });
    expect(bookings.data?.length).toBe(1);
    expect(payMongo.checkoutsCreated - before).toBe(1);
  });

  it("Case C: payment failed / checkout expired → reservation released, slot bookable again", async () => {
    for (const type of ["checkout_session.payment.failed", "checkout_session.expired"] as const) {
      const c = await securedCheckout("14:00");
      const w = await sendWebhook(failEvent(c, type));
      const s = await state(c.booking.id);
      const again = await holdViaRoute(SESSION, c.startsAt);
      record(`Case C ${type}`, { webhook: w.status, booking: s.booking, reservation: s.reservation, payments: s.payments, slotReheld: again.status });
      expect(s.reservation?.status === "released" || s.reservation?.status === "expired").toBe(true);
      expect(s.paidPayments).toBe(0);
      expect(again.status).toBe(201);
    }
  });

  it("Case D: paid while a downstream step fails → booking stays valid; behaviour of retries", async () => {
    // D1: receipt e-mail provider down (after-response side effect)
    const c1 = await securedCheckout("15:00");
    vi.mocked(sendPaymentReceipt).mockRejectedValueOnce(new Error("SAFETY-TEST receipt provider down"));
    const w1 = await sendWebhook(paidEvent(c1));
    await flush();
    const s1 = await state(c1.booking.id);
    const inbox1 = { data: pg(`select status from public.provider_webhook_inbox where safe_payload->>'booking_id' = ${lit(c1.booking.id)}`) };
    record("Case D1 receipt e-mail down", { webhook: w1.status, booking: s1.booking, projects: s1.projects, receipts: s1.receipts, inbox: inbox1.data });
    expect(s1.booking?.status).toBe("confirmed");

    // D2: project creation (in-transaction trigger) fails → what happens to the payment confirmation?
    const c2 = await securedCheckout("16:00");
    { const r = await rpc("safety_test_set_project_failure", { enabled: true }); if (r.error) throw r.error; }
    let w2: Awaited<ReturnType<typeof sendWebhook>>;
    const event2 = paidEvent(c2);
    try { w2 = await sendWebhook(event2); }
    finally { await rpc("safety_test_set_project_failure", { enabled: false }); }
    const s2 = await state(c2.booking.id);
    const inbox2 = { data: pg(`select event_id, status, attempts, last_error from public.provider_webhook_inbox where safe_payload->>'booking_id' = ${lit(c2.booking.id)}`) };
    // PayMongo retries: the same event later succeeds once the downstream is back
    const retry = await sendWebhook(event2);
    const s2b = await state(c2.booking.id);
    record("Case D2 project trigger down", { webhook: w2.status, afterFailure: { booking: s2.booking, paid: s2.paidPayments, projects: s2.projects }, inbox: inbox2.data, retryWebhook: retry.status, afterRetry: { booking: s2b.booking, paid: s2b.paidPayments, projects: s2b.projects } });
  });

  it("Case E: identical paid webhook ×1, ×2 sequential, ×10 concurrent → one financial/booking effect", async () => {
    const c = await securedCheckout("09:00");
    const event = paidEvent(c);
    const before = vi.mocked(sendPaymentReceipt).mock.calls.length;
    const first = await sendWebhook(event);
    const second = await sendWebhook(event);
    await flush();
    const afterSequential = vi.mocked(sendPaymentReceipt).mock.calls.length - before;
    // fresh booking for the concurrent burst
    const c10 = await securedCheckout("08:00");
    const event10 = paidEvent(c10);
    const b10 = vi.mocked(sendPaymentReceipt).mock.calls.length;
    const r = await concurrently(10, async () => { const w = await sendWebhook(event10); return w.status === 200 ? { outcome: "ok" } : { outcome: "error", detail: `${w.status} ${JSON.stringify(w.body)}` }; });
    await flush();
    const s = await state(c.booking.id); const s10 = await state(c10.booking.id);
    const out = { sequential: { statuses: [first.status, second.status], paid: s.paidPayments, receipts: s.receipts, allocations: s.allocations, projects: s.projects, receiptEmails: afterSequential },
      concurrent10: { ...r, values: undefined, paid: s10.paidPayments, receipts: s10.receipts, allocations: s10.allocations, projects: s10.projects, receiptEmails: vi.mocked(sendPaymentReceipt).mock.calls.length - b10 } };
    record("Case E", out);
    expect(s.paidPayments).toBe(1); expect(s.receipts).toBe(1); expect(s.allocations).toBe(1); expect(s.projects).toBe(1);
    expect(s10.paidPayments).toBe(1); expect(s10.receipts).toBe(1); expect(s10.allocations).toBe(1); expect(s10.projects).toBe(1);
  });

  it("Case F1: checkout-expired and payment-paid webhooks race (20 rounds) → deterministic, safe", async () => {
    const outcomes: Record<string, number> = {};
    for (let i = 0; i < 20; i++) {
      const c = await securedCheckout(["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"][i % 8]);
      const [paid, expired] = await Promise.all([sendWebhook(paidEvent(c)), sendWebhook(failEvent(c, "checkout_session.expired"))]);
      const s = await state(c.booking.id);
      const key = `paid:${paid.status} expired:${expired.status} → booking ${s.booking?.status}/${s.booking?.payment_status}, reservation ${s.reservation?.status}, paidPayments ${s.paidPayments}, projects ${s.projects}`;
      outcomes[key] = (outcomes[key] ?? 0) + 1;
    }
    record("Case F1 (20 rounds)", outcomes);
    for (const key of Object.keys(outcomes)) {
      // safe = paid ⇒ confirmed + booked reservation; not paid ⇒ released/expired reservation
      const paid = /paidPayments 1/.test(key);
      expect(paid ? /booking confirmed\/paid, reservation booked/.test(key) : /reservation (released|expired)/.test(key), key).toBe(true);
    }
  });

  it("Case G: abandoned checkout (no PayMongo event) — when does the slot become available again?", async () => {
    payMongo.expiresInSeconds = 3; // checkout session expires 3 s after creation
    const c = await securedCheckout("11:00");
    payMongo.expiresInSeconds = 3600;
    await new Promise((r) => setTimeout(r, 4500));
    await rpc("expire_booking_holds", { requested_limit: 500 });
    const reservation = { data: pg(`select status, type, expires_at from public.booking_reservations where booking_id = ${lit(c.booking.id)}`)[0] };
    const again = await holdViaRoute(SESSION, c.startsAt);
    const noExpiry = (() => { payMongo.expiresInSeconds = null; return securedCheckout("13:00"); })();
    const c2 = await noExpiry; payMongo.expiresInSeconds = 3600;
    const r2 = { data: pg<{ status: string; expires_at: string }>(`select status, expires_at from public.booking_reservations where booking_id = ${lit(c2.booking.id)}`)[0] };
    record("Case G abandoned checkout", { afterCheckoutExpiry: reservation.data, newCustomerHoldAfterExpiry: again.status,
      checkoutWithoutProviderExpiry: { reservation: r2.data?.status, blockedUntilDays: Math.round((Date.parse(r2.data!.expires_at) - Date.now()) / 86_400_000) } });
  });

  it("Case H: staff cancellation races the paid webhook (10 rounds) — paid + cancelled needs a recovery state", async () => {
    const outcomes: Record<string, number> = {};
    for (let i = 0; i < 10; i++) {
      const c = await securedCheckout(["08:00", "09:00", "10:00", "11:00", "13:00"][i % 5]);
      const [cancel, paid] = await Promise.all([setStatus(c.booking.reference, "cancelled"), sendWebhook(paidEvent(c))]);
      const s = await state(c.booking.id);
      const refund = await db().from("payments").select("status,refunded_amount_centavos").eq("booking_id", c.booking.id);
      const key = `cancel:${cancel.error?.code ?? "ok"} paid:${paid.status} → booking ${s.booking?.status}/${s.booking?.payment_status}, reservation ${s.reservation?.status}, payments ${JSON.stringify(refund.data?.map((p) => (p as { status: string }).status))}`;
      outcomes[key] = (outcomes[key] ?? 0) + 1;
    }
    record("Case H cancel vs paid (10 rounds)", outcomes);
  });

  it("Case F3: hold expires at the moment checkout activates (20 rounds) — never a checkout on an expired hold", async () => {
    const outcomes: Record<string, number> = {};
    for (let i = 0; i < 20; i++) {
      const day = freshDay(); const time = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"][i % 8]; const startsAt = at(day, time);
      const hold = await holdViaRoute(SESSION, startsAt);
      // make the hold expire ~during the checkout request (checkout takes ~70–150 ms locally)
      pgExec(`update public.booking_reservations set expires_at = clock_timestamp() + interval '${20 + (i % 10) * 20} milliseconds' where id = ${lit(String(hold.body.holdId))}`);
      const before = payMongo.checkoutsCreated;
      const [co] = await Promise.all([
        checkoutViaRoute({ session: SESSION, date: day, time, startsAt, holdId: String(hold.body.holdId), holdOwnerKey: hold.ownerKey }),
        (async () => { for (let k = 0; k < 8; k++) { await new Promise((r) => setTimeout(r, 25)); await rpc("expire_booking_holds", { requested_limit: 500 }); } })(),
      ]);
      const reservation = { data: pg<{ status: string; booking_id: string | null }>(`select status, booking_id from public.booking_reservations where id = ${lit(String(hold.body.holdId))}`)[0] };
      const created = payMongo.checkoutsCreated - before;
      const key = `checkout HTTP ${co.status}, providerCheckouts ${created} → reservation ${reservation.data?.status}${reservation.data?.booking_id ? " (linked)" : ""}`;
      outcomes[key] = (outcomes[key] ?? 0) + 1;
    }
    record("Case F3 hold expiry vs checkout (20 rounds)", outcomes);
    for (const k of Object.keys(outcomes)) {
      // unsafe = the customer receives a payable checkout URL (HTTP 200) while the reservation is not protecting the slot.
      // (HTTP 409 after the provider session was created leaves an orphan, unexposed provider session: LOW, recorded.)
      if (/checkout HTTP 200/.test(k)) expect(k, k).toMatch(/reservation booked/);
    }
  });

  it("Case F2: checkout expires, another customer takes the slot, then the late payment arrives", async () => {
    const c = await securedCheckout("10:00");
    const expired = await sendWebhook(failEvent(c, "checkout_session.expired"));
    const other = await holdViaRoute(SESSION, c.startsAt);
    const late = await sendWebhook(paidEvent(c));
    const s = await state(c.booking.id);
    const inbox = { data: pg(`select event_type, status, attempts, last_error from public.provider_webhook_inbox where safe_payload->>'booking_id' = ${lit(c.booking.id)} order by received_at`) };
    record("Case F2 late payment after slot re-sold", { expiredWebhook: expired.status, otherCustomerHold: other.status, latePaidWebhook: late.status, booking: s.booking, reservation: s.reservation, payments: s.payments, projects: s.projects, inbox: inbox.data });
  });
});
