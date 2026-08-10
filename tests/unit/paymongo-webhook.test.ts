import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  maybeSingle: vi.fn(),
  update: vi.fn(),
  updateEq: vi.fn(),
}));

vi.mock("@/lib/server/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: mocks.from }),
}));

import { POST } from "@/app/api/paymongo/webhook/route";

async function signedRequest(body: string, legacyField?: "te" | "li") {
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET!;
  const timestamp = "1786300000";
  const payload = legacyField ? `${timestamp}.${body}` : body;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const signature = Buffer.from(signed).toString("hex");
  const header = legacyField ? `t=${timestamp},${legacyField}=${signature}` : signature;
  return new Request("https://kahelstudio.com/api/paymongo/webhook", { method: "POST", headers: { "Content-Type": "application/json", "Paymongo-Signature": header }, body });
}

function paidEvent() {
  return JSON.stringify({ data: { id: "evt_test", type: "event", attributes: { type: "checkout_session.payment.paid", livemode: true, data: { id: "cs_test", attributes: { description: "Mini Session photography booking", payment_method_used: "gcash", payments: [{ id: "pay_test", attributes: { available_at: 1786386400, description: "Mini Session photography booking", paid_at: 1786300000, payment_intent_id: "pi_test", source: { type: "gcash" } } }], metadata: { booking_id: "booking-test" } } } } } });
}

describe("PayMongo webhook", () => {
  beforeEach(() => {
    process.env.PAYMONGO_WEBHOOK_SECRET = "whsec_test";
    mocks.updateEq.mockResolvedValue({ error: null });
    mocks.update.mockReturnValue({ eq: mocks.updateEq });
    mocks.from.mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }),
      update: mocks.update,
    });
  });

  afterEach(() => delete process.env.PAYMONGO_WEBHOOK_SECRET);

  it("records a full payment using the current signature format", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { id: "booking-test", payment_type: "full", total_amount_php: 150000, paid_amount_php: 0, payment_status: "pending", paymongo_payment_intent_id: null }, error: null });

    const response = await POST(await signedRequest(paidEvent()));

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ paid_amount_php: 150000, payment_status: "paid", paymongo_payment_id: "pay_test", paymongo_payment_intent_id: "pi_test", paymongo_payment_method: "gcash", paymongo_payment_description: "Mini Session photography booking", paymongo_paid_at: "2026-08-09T18:26:40.000Z", paymongo_available_at: "2026-08-10T18:26:40.000Z", status: "confirmed" }));
  });

  it("records a deposit and accepts legacy live signatures", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { id: "booking-test", payment_type: "deposit", total_amount_php: 99900, paid_amount_php: 0, payment_status: "pending", paymongo_payment_intent_id: null }, error: null });

    const response = await POST(await signedRequest(paidEvent(), "li"));

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ paid_amount_php: 49950, payment_status: "partially_paid" }));
  });

  it("repairs an earlier paid record with no amount", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { id: "booking-test", payment_type: "full", total_amount_php: 150000, paid_amount_php: 0, payment_status: "paid", paymongo_payment_intent_id: "pay_test" }, error: null });

    const response = await POST(await signedRequest(paidEvent(), "te"));

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ paid_amount_php: 150000 }));
  });

  it("rejects an invalid signature", async () => {
    const request = new Request("https://kahelstudio.com/api/paymongo/webhook", { method: "POST", headers: { "Paymongo-Signature": "0".repeat(64) }, body: paidEvent() });

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
