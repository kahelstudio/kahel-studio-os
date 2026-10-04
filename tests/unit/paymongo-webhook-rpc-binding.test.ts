import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Regression (Phase 4A, BLOCKER): the webhook detached `admin.rpc` from its client (`const rpc = admin.rpc`), so
// supabase-js lost `this` and every ledger event (paid / failed / expired) threw "Cannot read properties of undefined
// (reading 'rest')" → HTTP 503 → payments were never confirmed and failed checkouts never released their slot.
// The fake client below reproduces supabase-js semantics: `rpc` only works when called on the client.
class FakeSupabaseClient {
  rest = { calls: [] as string[] };
  rpc(name: string) {
    this.rest.calls.push(name);
    if (name === "enqueue_provider_webhook_event") return Promise.resolve({ data: { status: "pending" }, error: null });
    if (name === "confirm_paymongo_payment") return Promise.resolve({ data: { id: "payment-1", booking_id: "booking-1" }, error: null });
    if (name === "fail_or_expire_provider_payment") return Promise.resolve({ data: { booking_id: "booking-1" }, error: null });
    return Promise.resolve({ data: { status: "processed" }, error: null });
  }
  from() { return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }; }
}
const client = new FakeSupabaseClient();
vi.mock("@/lib/server/supabase-admin", () => ({ getSupabaseAdmin: () => client }));
vi.mock("@/lib/server/payments-data", () => ({ getPaymentReceipt: vi.fn(async () => null) }));
vi.mock("@/lib/server/payment-receipt-email", () => ({ sendPaymentReceipt: vi.fn(async () => true) }));
vi.mock("next/server", async (original) => ({ ...(await original<typeof import("next/server")>()), after: () => undefined }));

function signed(event: unknown) {
  const body = JSON.stringify(event);
  return new Request("http://localhost/api/paymongo/webhook", { method: "POST", body, headers: { "Paymongo-Signature": createHmac("sha256", "whsk_unit_test").update(body).digest("hex") } });
}
const event = (type: string) => ({ data: { id: `evt_${type}`, attributes: { type, livemode: false, created_at: 1_800_000_000, data: { id: "cs_test_1", attributes: {
  reference_number: "KS-TEST", currency: "PHP", amount: 150000, metadata: { payment_id: "00000000-0000-4000-8000-000000000001", booking_id: "booking-1" },
  payments: type.endsWith(".paid") ? [{ id: "pay_1", attributes: { amount: 150000, currency: "PHP", paid_at: 1_800_000_000 } }] : [] } } } } });

describe("PayMongo webhook keeps the Supabase client bound when calling RPCs", () => {
  beforeEach(() => { client.rest.calls = []; process.env.PAYMONGO_WEBHOOK_SECRET = "whsk_unit_test"; (process.env as Record<string, string>).APP_ENV = "development"; });

  it("confirms a paid ledger event (200, confirm_paymongo_payment called)", async () => {
    const { POST } = await import("@/app/api/paymongo/webhook/route");
    const response = await POST(signed(event("checkout_session.payment.paid")));
    expect(response.status).toBe(200);
    expect(client.rest.calls).toContain("confirm_paymongo_payment");
    expect(client.rest.calls).toContain("finish_provider_webhook_event");
  });

  it("releases the reservation for failed and expired checkouts", async () => {
    const { POST } = await import("@/app/api/paymongo/webhook/route");
    for (const type of ["checkout_session.payment.failed", "checkout_session.expired"]) {
      client.rest.calls = [];
      const response = await POST(signed(event(type)));
      expect(response.status).toBe(200);
      expect(client.rest.calls).toEqual(expect.arrayContaining(["fail_or_expire_provider_payment", "release_failed_booking_checkout"]));
    }
  });
});
