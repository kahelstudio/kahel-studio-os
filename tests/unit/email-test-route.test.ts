import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  principal: vi.fn(),
  trusted: vi.fn(() => true),
  send: vi.fn(),
  processQueue: vi.fn().mockResolvedValue({ processed: 0, accepted: 0, failed: 0 }),
  admin: {
    from: vi.fn(),
  },
}));

vi.mock("@/lib/server/staff-auth", () => ({ getStaffPrincipal: mocks.principal }));
vi.mock("@/lib/server/customer-auth", () => ({ hasTrustedOrigin: mocks.trusted }));
vi.mock("@/lib/server/supabase-admin", () => ({ getSupabaseAdmin: () => mocks.admin }));
vi.mock("@/lib/server/transactional-email-service", () => ({
  sendTransactionalEmail: mocks.send,
  processTransactionalEmailQueue: mocks.processQueue,
}));

import { POST } from "@/app/api/email/test/route";

afterEach(() => {
  vi.unstubAllEnvs();
  mocks.principal.mockReset();
  mocks.trusted.mockReset().mockReturnValue(true);
  mocks.send.mockReset();
  mocks.processQueue.mockReset().mockResolvedValue({ processed: 0, accepted: 0, failed: 0 });
  mocks.admin.from.mockReset();
});

function superAdmin() {
  mocks.principal.mockResolvedValue({ role: "super_admin", userId: "admin-1", email: "admin@kahelstudio.com" });
}

function noRecentMessages() {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "in", "gte", "order"]) chain[m] = vi.fn(() => chain);
  chain.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) =>
    Promise.resolve(resolve({ data: [], error: null }));
  mocks.admin.from.mockReturnValue(chain);
}

function request(recipients: string[]) {
  return new Request("https://dashboard.kahelstudio.com/api/email/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipients }),
  });
}

describe("POST /api/email/test — authorization", () => {
  it("rejects unauthenticated requests with 401", async () => {
    mocks.principal.mockResolvedValue(null);
    const res = await POST(request(["eusebio.barrun@gmail.com"]));
    expect(res.status).toBe(401);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("rejects admin (not super_admin) with 401", async () => {
    mocks.principal.mockResolvedValue({ role: "admin", userId: "a1", email: "admin@kahelstudio.com" });
    const res = await POST(request(["eusebio.barrun@gmail.com"]));
    expect(res.status).toBe(401);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("rejects staff with 401", async () => {
    mocks.principal.mockResolvedValue({ role: "staff", userId: "s1", email: "staff@kahelstudio.com" });
    const res = await POST(request(["eusebio.barrun@gmail.com"]));
    expect(res.status).toBe(401);
    expect(mocks.send).not.toHaveBeenCalled();
  });
});

describe("POST /api/email/test — recipient validation", () => {
  it("rejects recipients not in the canonical approved list", async () => {
    superAdmin();
    vi.stubEnv("BOOKING_EMAIL_FROM", "hello@kahelstudio.com");
    const res = await POST(request(["unknown@example.com"]));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Choose only the approved test recipients." });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("rejects the old studio address that was replaced", async () => {
    superAdmin();
    vi.stubEnv("BOOKING_EMAIL_FROM", "hello@kahelstudio.com");
    const res = await POST(request(["hello@kahel.studio"]));
    expect(res.status).toBe(400);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("rejects an empty recipient list", async () => {
    superAdmin();
    vi.stubEnv("BOOKING_EMAIL_FROM", "hello@kahelstudio.com");
    const res = await POST(request([]));
    expect(res.status).toBe(400);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("returns 503 when BOOKING_EMAIL_FROM is not configured", async () => {
    superAdmin();
    vi.stubEnv("BOOKING_EMAIL_FROM", "");
    const res = await POST(request(["eusebio.barrun@gmail.com"]));
    expect(res.status).toBe(503);
    expect(mocks.send).not.toHaveBeenCalled();
  });
});

describe("POST /api/email/test — happy path", () => {
  it("accepts all three canonical test inboxes", async () => {
    superAdmin();
    vi.stubEnv("BOOKING_EMAIL_FROM", "hello@kahelstudio.com");
    noRecentMessages();
    mocks.send.mockResolvedValue(true);
    const res = await POST(request(["eusebio.barrun@gmail.com", "joanne.kahelstudio@gmail.com", "luiz.kahelstudio@gmail.com"]));
    expect(res.status).toBe(200);
    expect(mocks.send).toHaveBeenCalledTimes(3);
  });

  it("deduplicates repeated recipients (case-insensitive)", async () => {
    superAdmin();
    vi.stubEnv("BOOKING_EMAIL_FROM", "hello@kahelstudio.com");
    noRecentMessages();
    mocks.send.mockResolvedValue(true);
    const res = await POST(request(["eusebio.barrun@gmail.com", "EUSEBIO.BARRUN@GMAIL.COM"]));
    expect(res.status).toBe(200);
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });

  it("passes the correct display name for each canonical recipient", async () => {
    superAdmin();
    vi.stubEnv("BOOKING_EMAIL_FROM", "hello@kahelstudio.com");
    noRecentMessages();
    mocks.send.mockResolvedValue(true);

    await POST(request(["eusebio.barrun@gmail.com"]));
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ recipientName: "Eusebio" }));
    mocks.send.mockClear(); noRecentMessages();

    await POST(request(["joanne.kahelstudio@gmail.com"]));
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ recipientName: "Joanne" }));
    mocks.send.mockClear(); noRecentMessages();

    await POST(request(["luiz.kahelstudio@gmail.com"]));
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ recipientName: "Luiz" }));
  });

  it("uses the delivery-test template key and operator.delivery_test trigger", async () => {
    superAdmin();
    vi.stubEnv("BOOKING_EMAIL_FROM", "hello@kahelstudio.com");
    noRecentMessages();
    mocks.send.mockResolvedValue(true);
    await POST(request(["eusebio.barrun@gmail.com"]));
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({
      templateKey: "delivery-test",
      triggerKey: "operator.delivery_test",
      source: "staff",
    }));
  });

  it("returns 502 when a send fails for any recipient", async () => {
    superAdmin();
    vi.stubEnv("BOOKING_EMAIL_FROM", "hello@kahelstudio.com");
    noRecentMessages();
    mocks.send.mockResolvedValue(false);
    const res = await POST(request(["eusebio.barrun@gmail.com"]));
    expect(res.status).toBe(502);
    const body = await res.json() as { results: Array<{ accepted: boolean }> };
    expect(body.results[0].accepted).toBe(false);
  });
});
