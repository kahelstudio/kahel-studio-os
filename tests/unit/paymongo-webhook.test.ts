import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdmin: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  maybeSingle: vi.fn(),
  update: vi.fn(),
  updateEq: vi.fn(),
  updateCheckoutEq: vi.fn(),
  after: vi.fn(),
  getPaymentReceipt: vi.fn(),
  sendPaymentReceipt: vi.fn(),
  pending: [] as Array<() => void | Promise<void>>,
}));

vi.mock("@/lib/server/supabase-admin", () => ({ getSupabaseAdmin: mocks.getAdmin }));
vi.mock("@/lib/server/payments-data", () => ({ getPaymentReceipt: mocks.getPaymentReceipt }));
vi.mock("@/lib/server/payment-receipt-email", () => ({ sendPaymentReceipt: mocks.sendPaymentReceipt }));
vi.mock("next/server", async (importOriginal) => ({
  ...await importOriginal<typeof import("next/server")>(),
  after: mocks.after,
}));

import { POST, verifySignature } from "@/app/api/paymongo/webhook/route";

const secret = "whsec_test";
const paymentId = "10000000-0000-4000-8000-000000000001";

async function signature(payload: string, timestamp?: number, field: "te" | "li" = "te") {
  const signedPayload = timestamp === undefined ? payload : `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const digest = Buffer.from(signed).toString("hex");
  return timestamp === undefined ? digest : `t=${timestamp},${field}=${digest}`;
}

async function signedRequest(body: string, legacy?: "te" | "li", timestamp = Math.floor(Date.now() / 1000)) {
  const header = await signature(body, legacy ? timestamp : undefined, legacy);
  return new Request("https://kahelstudio.com/api/paymongo/webhook", { method: "POST", headers: { "Paymongo-Signature": header }, body });
}

async function flushAfter() {
  for (const callback of mocks.pending.splice(0)) await callback();
}

async function deliver(body: string, legacy?: "te" | "li", timestamp?: number) {
  const response = await POST(await signedRequest(body, legacy, timestamp));
  await flushAfter();
  return response;
}

function event(options: {
  type?: string;
  metadata?: Record<string, string>;
  amount?: number;
  currency?: string;
  checkoutId?: string;
  reference?: string;
  eventId?: string;
  includeAmount?: boolean;
  method?: string;
} = {}) {
  const now = Math.floor(Date.now() / 1000);
  const amount = options.amount ?? 150000;
  const checkoutAmount = options.includeAmount === false ? {} : { amount, currency: options.currency ?? "PHP" };
  const paymentAmount = options.includeAmount === false ? {} : { amount_paid: amount, currency: options.currency ?? "PHP" };
  return JSON.stringify({ data: { id: options.eventId ?? "evt_test", type: "event", attributes: {
    type: options.type ?? "checkout_session.payment.paid",
    created_at: now,
    data: { id: options.checkoutId ?? "cs_test", attributes: {
      ...checkoutAmount,
      description: "Mini Session photography booking",
      payment_method_used: options.method ?? "gcash",
      reference_number: options.reference ?? "KS-2026-TEST",
      metadata: options.metadata ?? { payment_id: paymentId },
      paid_at: now,
      payments: [{ id: "pay_test", attributes: { available_at: now + 86400, ...paymentAmount, description: "Mini Session photography booking", paid_at: now, payment_intent_id: "pi_test", source: { type: "gcash" } } }],
    } },
  } } });
}

function booking(overrides: Record<string, unknown> = {}) {
  return {
    id: "booking-test", reference: "KS-2026-TEST", payment_type: "full", currency: "PHP",
    total_amount_php: 150000, paid_amount_php: 0, payment_status: "pending",
    paymongo_checkout_session_id: "cs_test", paymongo_payment_id: null,
    paymongo_payment_intent_id: null, paymongo_payment_method: null,
    paymongo_payment_description: null, paymongo_paid_at: null,
    paymongo_available_at: null, paymongo_credited_at: null, ...overrides,
  };
}

describe("PayMongo webhook", () => {
  beforeEach(() => {
    process.env.PAYMONGO_WEBHOOK_SECRET = secret;
    mocks.pending.length = 0;
    mocks.after.mockImplementation((callback: () => void | Promise<void>) => { mocks.pending.push(callback); });
    mocks.getAdmin.mockReturnValue({ from: mocks.from, rpc: mocks.rpc });
    mocks.rpc.mockResolvedValue({ data: { id: paymentId, status: "paid" }, error: null });
    mocks.updateCheckoutEq.mockResolvedValue({ error: null });
    mocks.updateEq.mockReturnValue({ eq: mocks.updateCheckoutEq });
    mocks.update.mockReturnValue({ eq: mocks.updateEq });
    mocks.from.mockReturnValue({
      select: vi.fn()
        .mockReturnValueOnce({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { status: "accepted", acceptance_id: "test-acceptance" }, error: null }) }) })
        .mockReturnValueOnce({ eq: vi.fn().mockReturnValue({ maybeSingle: mocks.maybeSingle }) }),
      update: mocks.update,
    });
  });

  afterEach(() => {
    delete process.env.PAYMONGO_WEBHOOK_SECRET;
    vi.clearAllMocks();
  });

  it("rejects invalid signatures", async () => {
    const response = await POST(new Request("https://kahelstudio.com/api/paymongo/webhook", { method: "POST", headers: { "Paymongo-Signature": "0".repeat(64) }, body: event() }));
    expect(response.status).toBe(401);
    expect(mocks.getAdmin).not.toHaveBeenCalled();
  });

  it("reports missing webhook configuration", async () => {
    delete process.env.PAYMONGO_WEBHOOK_SECRET;
    const response = await POST(new Request("https://kahelstudio.com/api/paymongo/webhook", { method: "POST", body: "{}" }));

    expect(response.status).toBe(503);
    expect(mocks.getAdmin).not.toHaveBeenCalled();
  });

  it("acknowledges malformed signed JSON without processing it", async () => {
    const response = await deliver("{");

    expect(response.status).toBe(200);
    expect(mocks.getAdmin).not.toHaveBeenCalled();
  });

  it("accepts current raw HMAC and both current legacy fields", async () => {
    const body = event({ type: "unhandled.event", metadata: {} });
    expect((await deliver(body)).status).toBe(200);
    expect((await deliver(body, "te")).status).toBe(200);
    expect((await deliver(body, "li")).status).toBe(200);
  });

  it("rejects a correctly signed stale legacy timestamp", async () => {
    const body = event();
    const stale = Math.floor(Date.now() / 1000) - 301;
    expect(await verifySignature(body, await signature(body, stale), secret)).toBe(false);
    expect((await POST(await signedRequest(body, "te", stale))).status).toBe(401);
  });

  it("confirms a ledger payment with safe parsed fields", async () => {
    const response = await deliver(event());

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("confirm_paymongo_payment", expect.objectContaining({
      requested_provider_event_id: "evt_test",
      requested_checkout_session_id: "cs_test",
      requested_metadata_payment_id: paymentId,
      requested_provider_payment_id: "pay_test",
      requested_payment_intent_id: "pi_test",
      requested_amount_centavos: 150000,
      requested_payment_method_detail: "gcash",
      requested_payload: expect.objectContaining({ amount: 150000, currency: "PHP", reference: "KS-2026-TEST" }),
    }));
    expect(mocks.from).not.toHaveBeenCalled();
    const args = mocks.rpc.mock.calls.find(([name]) => name === "confirm_paymongo_payment")?.[1];
    expect(args.requested_payload).not.toHaveProperty("metadata");
    expect(args.requested_payload).not.toHaveProperty("raw");
  });

  it("persists before acknowledging delivery", async () => {
    const response = await POST(await signedRequest(event()));

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledTimes(3);
  });

  it("delegates duplicate paid events atomically to the confirmation RPC", async () => {
    mocks.rpc.mockResolvedValue({ data: { id: paymentId, status: "paid" }, error: null });
    const body = event({ eventId: "evt_duplicate" });

    expect((await deliver(body)).status).toBe(200);
    expect((await deliver(body)).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledTimes(6);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it.each(["checkout_session.payment.failed", "checkout_session.expired"])("delegates %s to the failure RPC", async (type) => {
    const response = await deliver(event({ type }));
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("fail_or_expire_provider_payment", expect.objectContaining({ requested_event_type: type, requested_metadata_payment_id: paymentId }));
  });

  it("records BillEase as the verified payment method", async () => {
    const response = await deliver(event({ method: "billease" }));
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("confirm_paymongo_payment", expect.objectContaining({ requested_payment_method_detail: "billease" }));
  });

  it("queues the ledger receipt after a BillEase payment is confirmed", async () => {
    mocks.rpc.mockResolvedValue({ data: { id: paymentId, booking_id: "booking-test", status: "paid" }, error: null });
    mocks.getPaymentReceipt.mockResolvedValue({
      receipt: { receipt_number: "OR-1", client_name: "Ana Cruz", booking_reference: "KS-2026-TEST", invoice_reference: null, payment_method: "billease", amount_centavos: 150000, cash_received_centavos: null, change_centavos: null, issued_at: "2026-08-22T00:00:00Z" },
      lines: [{ description: "Booking payment", quantity: 1, totalCentavos: 150000 }],
    });
    mocks.from.mockImplementation((table: string) => table === "bookings"
      ? { select: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { client_id: "client-test", client_profile_id: "profile-test" }, error: null }) }) }) }
      : { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { email: "ana@example.com" }, error: null }) }) }) }) });

    expect((await deliver(event({ method: "billease" }))).status).toBe(200);
    expect(mocks.sendPaymentReceipt).toHaveBeenCalledOnce();
    expect(mocks.sendPaymentReceipt).toHaveBeenCalledWith(expect.objectContaining({ method: "Buy Now Pay Later", paymentId, source: "system" }));
  });

  it("returns a retryable response when ledger persistence fails", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "database unavailable" } });
    const response = await deliver(event());
    expect(response.status).toBe(503);
  });

  it("preserves booking-only paid checkout behavior with bound checkout and reference", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: booking(), error: null });
    const agreementAccepted = vi.fn().mockResolvedValue({ data: { status: "accepted", acceptance_id: "test-acceptance" }, error: null });
    mocks.from.mockImplementation((table: string) => {
      if (table === "booking_agreement_requirements") {
        return { select: () => ({ eq: () => ({ maybeSingle: agreementAccepted }) }) };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }), update: mocks.update };
    });
    const body = event({ metadata: { booking_id: "booking-test" } });
    const response = await deliver(body, "li");

    expect(response.status).toBe(200);
    expect(mocks.rpc).not.toHaveBeenCalledWith("confirm_paymongo_payment", expect.anything());
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      paid_amount_php: 150000, payment_status: "paid", paymongo_payment_id: "pay_test",
      paymongo_payment_intent_id: "pi_test", paymongo_payment_method: "gcash", status: "confirmed",
    }));
    expect(mocks.updateCheckoutEq).toHaveBeenCalledWith("paymongo_checkout_session_id", "cs_test");
  });

  it("records the expected legacy deposit amount", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: booking({ payment_type: "deposit", total_amount_php: 99900 }), error: null });
    const agreementAccepted = vi.fn().mockResolvedValue({ data: { status: "accepted", acceptance_id: "test-acceptance" }, error: null });
    mocks.from.mockImplementation((table: string) => {
      if (table === "booking_agreement_requirements") {
        return { select: () => ({ eq: () => ({ maybeSingle: agreementAccepted }) }) };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }), update: mocks.update };
    });
    const response = await deliver(event({ metadata: { booking_id: "booking-test" }, amount: 49950 }));
    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ paid_amount_php: 49950, payment_status: "partially_paid" }));
  });

  it("records the correct paid amount for a deposit with add-ons", async () => {
    // total_amount_php = package (99900) + addon (30000) = 129900
    // PayMongo charge = package × 50% (49950) + addon full (30000) = 79950
    // which is not equal to total_amount_php × 50% (64950)
    mocks.maybeSingle.mockResolvedValue({ data: booking({ payment_type: "deposit", total_amount_php: 129900 }), error: null });
    const agreementAccepted = vi.fn().mockResolvedValue({ data: { status: "accepted", acceptance_id: "test-acceptance" }, error: null });
    mocks.from.mockImplementation((table: string) => {
      if (table === "booking_agreement_requirements") {
        return { select: () => ({ eq: () => ({ maybeSingle: agreementAccepted }) }) };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }), update: mocks.update };
    });
    const response = await deliver(event({ metadata: { booking_id: "booking-test" }, amount: 79950 }));
    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ paid_amount_php: 79950, payment_status: "partially_paid" }));
  });

  it("preserves legacy booking checkout payloads that omit amount", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: booking(), error: null });
    const agreementAccepted = vi.fn().mockResolvedValue({ data: { status: "accepted", acceptance_id: "test-acceptance" }, error: null });
    mocks.from.mockImplementation((table: string) => {
      if (table === "booking_agreement_requirements") {
        return { select: () => ({ eq: () => ({ maybeSingle: agreementAccepted }) }) };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }), update: mocks.update };
    });
    const response = await deliver(event({ metadata: { booking_id: "booking-test" }, includeAmount: false }));
    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ paid_amount_php: 150000, payment_status: "paid" }));
  });

  it("acknowledges a legacy amount mismatch without updating the booking", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: booking(), error: null });
    const response = await deliver(event({ metadata: { booking_id: "booking-test" }, amount: 149999 }));
    expect(response.status).toBe(200);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("acknowledges an unbound legacy checkout or reference", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: booking({ paymongo_checkout_session_id: "cs_other" }), error: null });
    const response = await deliver(event({ metadata: { booking_id: "booking-test" } }));
    expect(response.status).toBe(200);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("acknowledges a missing legacy booking", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    const response = await deliver(event({ metadata: { booking_id: "booking-test" } }));
    expect(response.status).toBe(200);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("returns a retryable response for legacy database errors", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: { message: "database unavailable" } });
    expect((await deliver(event({ metadata: { booking_id: "booking-test" } }))).status).toBe(503);

    mocks.maybeSingle.mockResolvedValue({ data: booking(), error: null });
    mocks.updateCheckoutEq.mockResolvedValue({ error: { message: "update unavailable" } });
    expect((await deliver(event({ metadata: { booking_id: "booking-test" } }))).status).toBe(503);
  });
});
