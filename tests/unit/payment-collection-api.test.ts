import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorizePayments: vi.fn(),
  getSupabaseAdmin: vi.fn(),
}));

vi.mock("@/app/api/payments/_shared", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/app/api/payments/_shared")>();
  return { ...original, authorizePayments: mocks.authorizePayments };
});
vi.mock("@/lib/server/supabase-admin", () => ({ getSupabaseAdmin: mocks.getSupabaseAdmin }));

import { POST } from "@/app/api/payments/collection/route";

const bookingId = "10000000-0000-4000-8000-000000000001";
const productId = "20000000-0000-4000-8000-000000000002";
const registerSessionId = "30000000-0000-4000-8000-000000000003";

function request(body: Record<string, unknown>) {
  return new Request("https://kahelstudio.com/api/payments/collection", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ bookingId, method: "cash", registerSessionId, balanceCentavos: 0, idempotencyKey: "request-key-123", receipt: true, createInvoice: false, ...body }),
  });
}

describe("payment collection API validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorizePayments.mockResolvedValue({ principal: { userId: "staff-id", email: "admin@example.com", role: "admin" } });
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { status: "accepted", acceptance_id: "test-acceptance" }, error: null })
        })
      }),
      rpc: vi.fn().mockResolvedValue({ data: null, error: new Error("stop") })
    });
    mocks.getSupabaseAdmin.mockReturnValue({ from: mockFrom });
    process.env.PAYMONGO_SECRET_KEY = "sk_test_example";
  });

  it.each([0, -1, 1.5, 2_147_483_648])("rejects invalid add-on quantity %s after agreement check", async (quantity) => {
    const response = await POST(request({ addOns: [{ productId, quantity }] }));
    expect(response.status).toBe(400);
    expect((await response.json() as { error: string }).error).toMatch(/quantity/i);
  });

  it("rejects invalid booking IDs and idempotency keys after agreement check", async () => {
    const invalidBooking = await POST(request({ bookingId: "not-a-uuid" }));
    const invalidKey = await POST(request({ idempotencyKey: "short" }));
    expect(invalidBooking.status).toBe(400);
    expect(invalidKey.status).toBe(400);
  });

  it.each([undefined, "", "not-a-uuid"])("rejects cash register session ID %s after agreement check", async (sessionId) => {
    const response = await POST(request({ registerSessionId: sessionId, confirmed: true }));
    expect(response.status).toBe(400);
    expect((await response.json() as { error: string }).error).toMatch(/cash register/i);
  });

  it.each([undefined, "not-a-uuid"])("does not require register session ID %s for digital collection", async (sessionId) => {
    const admin = { rpc: vi.fn().mockResolvedValue({ data: { payment: { id: "pay-1", status: "pending", checkout_url: "https://paymongo.com" } }, error: null }) };
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { status: "accepted", acceptance_id: "test-acceptance" }, error: null })
        })
      }),
      rpc: vi.fn().mockResolvedValue({ data: { payment: { id: "pay-1", status: "pending", checkout_url: "https://paymongo.com" } }, error: null })
    });
    mocks.getSupabaseAdmin.mockReturnValue({ from: mockFrom, rpc: vi.fn().mockResolvedValue({ data: { payment: { id: "pay-1", status: "pending", checkout_url: "https://paymongo.com" } }, error: null }) });
    await POST(request({ method: "paymongo", registerSessionId: sessionId }));
    expect(mocks.getSupabaseAdmin).toHaveBeenCalled();
  });
});
