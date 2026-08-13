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
  pending: [] as Array<() => void | Promise<void>>,
}));

vi.mock("@/lib/server/supabase-admin", () => ({ getSupabaseAdmin: mocks.getAdmin }));
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
      payment_method_used: "gcash",
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
      select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }),
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
    const args = mocks.rpc.mock.calls[0][1];
    expect(args.requested_payload).not.toHaveProperty("metadata");
    expect(args.requested_payload).not.toHaveProperty("raw");
  });

  it("acknowledges before starting database processing", async () => {
    const response = await POST(await signedRequest(event()));

    expect(response.status).toBe(200);
    expect(mocks.rpc).not.toHaveBeenCalled();

    await flushAfter();
    expect(mocks.rpc).toHaveBeenCalledOnce();
  });

  it("delegates duplicate paid events atomically to the confirmation RPC", async () => {
    mocks.rpc.mockResolvedValue({ data: { id: paymentId, status: "paid" }, error: null });
    const body = event({ eventId: "evt_duplicate" });

    expect((await deliver(body)).status).toBe(200);
    expect((await deliver(body)).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it.each(["checkout_session.payment.failed", "checkout_session.expired"])("delegates %s to the failure RPC", async (type) => {
    const response = await deliver(event({ type }));
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("fail_or_expire_provider_payment", expect.objectContaining({ requested_event_type: type, requested_metadata_payment_id: paymentId }));
  });

  it("acknowledges ledger persistence failures so PayMongo does not disable the webhook", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "database unavailable" } });
    const response = await deliver(event());
    expect(response.status).toBe(200);
  });

  it("preserves booking-only paid checkout behavior with bound checkout and reference", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: booking(), error: null });
    const body = event({ metadata: { booking_id: "booking-test" } });
    const response = await deliver(body, "li");

    expect(response.status).toBe(200);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      paid_amount_php: 150000, payment_status: "paid", paymongo_payment_id: "pay_test",
      paymongo_payment_intent_id: "pi_test", paymongo_payment_method: "gcash", status: "confirmed",
    }));
    expect(mocks.updateCheckoutEq).toHaveBeenCalledWith("paymongo_checkout_session_id", "cs_test");
  });

  it("records the expected legacy deposit amount", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: booking({ payment_type: "deposit", total_amount_php: 99900 }), error: null });
    const response = await deliver(event({ metadata: { booking_id: "booking-test" }, amount: 49950 }));
    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ paid_amount_php: 49950, payment_status: "partially_paid" }));
  });

  it("preserves legacy booking checkout payloads that omit amount", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: booking(), error: null });
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

  it("acknowledges legacy database errors so PayMongo does not disable the webhook", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: { message: "database unavailable" } });
    expect((await deliver(event({ metadata: { booking_id: "booking-test" } }))).status).toBe(200);

    mocks.maybeSingle.mockResolvedValue({ data: booking(), error: null });
    mocks.updateCheckoutEq.mockResolvedValue({ error: { message: "update unavailable" } });
    expect((await deliver(event({ metadata: { booking_id: "booking-test" } }))).status).toBe(200);
  });
});
