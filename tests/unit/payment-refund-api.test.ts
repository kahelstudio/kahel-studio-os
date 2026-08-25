import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ authorizePayments: vi.fn(), getSupabaseAdmin: vi.fn() }));

vi.mock("@/app/api/payments/_shared", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/app/api/payments/_shared")>();
  return { ...original, authorizePayments: mocks.authorizePayments };
});
vi.mock("@/lib/server/supabase-admin", () => ({ getSupabaseAdmin: mocks.getSupabaseAdmin }));

import { POST } from "@/app/api/payments/refund/route";

const paymentId = "10000000-0000-4000-8000-000000000001";
const approvalRequestId = "20000000-0000-4000-8000-000000000002";
const bookingId = "30000000-0000-4000-8000-000000000003";
const clientId = "40000000-0000-4000-8000-000000000004";

function request(overrides: Record<string, unknown> = {}) {
  return new Request("https://kahelstudio.com/api/payments/refund", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ paymentId, approvalRequestId, amountCentavos: 2500, reason: "Approved cash return", idempotencyKey: "refund-key-123", ...overrides }) });
}

function query(data: Record<string, unknown> | null) {
  const result = { data, error: null };
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq"]) chain[method] = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => result);
  return chain;
}

describe("cash refund API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorizePayments.mockResolvedValue({ principal: { userId: "staff-id", email: "super@example.com", role: "super_admin" } });
  });

  it("requires Super Admin before database access", async () => {
    mocks.authorizePayments.mockResolvedValue({ principal: { userId: "staff-id", email: "admin@example.com", role: "admin" } });
    const response = await POST(request());
    expect(response.status).toBe(403);
    expect(mocks.getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it.each([{ amountCentavos: 25.5 }, { approvalRequestId: "invalid" }, { reason: "x" }, { idempotencyKey: "short" }])("rejects invalid input before database access", async (override) => {
    const response = await POST(request(override));
    expect(response.status).toBe(400);
    expect(mocks.getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("rejects an approval not bound to the exact payment amount", async () => {
    const payment = query({ id: paymentId, booking_id: bookingId, client_id: clientId, processor: "none", source: "staff", payment_method: "cash", status: "paid", amount_centavos: 5000, refunded_amount_centavos: 0, add_on_amount_centavos: 0 });
    const approval = query({ id: approvalRequestId, request_type: "client_refund", status: "approved", fulfillment_status: "not_released", source_record_id: paymentId, booking_id: bookingId, client_id: clientId, amount_php: 2400 });
    mocks.getSupabaseAdmin.mockReturnValue({ from: vi.fn((table: string) => table === "payments" ? payment : approval) });
    const response = await POST(request());
    expect(response.status).toBe(409);
  });

  it("rejects a closed optional register session", async () => {
    const registerSessionId = "50000000-0000-4000-8000-000000000005";
    const payment = query({ id: paymentId, booking_id: bookingId, client_id: clientId, processor: "none", source: "staff", payment_method: "cash", status: "paid", amount_centavos: 5000, refunded_amount_centavos: 0, add_on_amount_centavos: 0 });
    const approval = query({ id: approvalRequestId, request_type: "client_refund", status: "approved", fulfillment_status: "not_released", source_record_id: paymentId, booking_id: bookingId, client_id: clientId, amount_php: 2500 });
    const session = query({ id: registerSessionId, status: "closed" });
    mocks.getSupabaseAdmin.mockReturnValue({ from: vi.fn((table: string) => table === "payments" ? payment : table === "approval_requests" ? approval : session) });
    const response = await POST(request({ registerSessionId }));
    expect(response.status).toBe(409);
  });

  it("calls the cash refund RPC with the validated binding", async () => {
    const payment = query({ id: paymentId, booking_id: bookingId, client_id: clientId, processor: "none", source: "staff", payment_method: "cash", status: "paid", amount_centavos: 5000, refunded_amount_centavos: 0, add_on_amount_centavos: 0 });
    const approval = query({ id: approvalRequestId, request_type: "client_refund", status: "approved", fulfillment_status: "not_released", source_record_id: paymentId, booking_id: bookingId, client_id: clientId, amount_php: 2500 });
    const rpc = vi.fn().mockResolvedValue({ data: { id: "refund-id" }, error: null });
    mocks.getSupabaseAdmin.mockReturnValue({ from: vi.fn((table: string) => table === "payments" ? payment : approval), rpc });
    const response = await POST(request({ registerSessionId: null }));
    expect(response.status).toBe(201);
    expect(rpc).toHaveBeenCalledWith("refund_cash_payment", expect.objectContaining({ requested_payment_id: paymentId, requested_approval_request_id: approvalRequestId, requested_amount_centavos: 2500, requested_actor_id: "staff-id", requested_register_session_id: null }));
  });
});
