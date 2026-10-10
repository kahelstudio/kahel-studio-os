import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  admin: { from: vi.fn(), rpc: vi.fn() },
  send: vi.fn(),
}));
vi.mock("@/lib/server/supabase-admin", () => ({ getSupabaseAdmin: () => mocks.admin }));
vi.mock("@/lib/resend-email", async (original) => {
  const actual = await original<typeof import("@/lib/resend-email")>();
  return { ...actual, sendResendEmail: mocks.send };
});

import { enqueueTransactionalEmail, processTransactionalEmailQueue } from "@/lib/server/transactional-email-service";

const row = {
  id: "message-1", claim_token: "claim-1", recipient_email: "client@example.com",
  sender_email: "hello@kahelstudio.com", sender_name: "Kahel Studio", reply_to_email: null,
  rendered_subject: "Booking received", rendered_html: "<p>Received</p>", rendered_text: "Received",
  logical_idempotency_key: "booking:one", contains_secure_content: false, status: "processing",
};

afterEach(() => {
  vi.unstubAllEnvs();
  mocks.admin.from.mockReset();
  mocks.admin.rpc.mockReset();
  mocks.send.mockReset();
});

describe("transactional queue processing", () => {
  it("records a provider configuration failure after claiming the message", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    mocks.admin.rpc
      .mockResolvedValueOnce({ data: row, error: null })
      .mockResolvedValueOnce({ data: { ...row, status: "failed" }, error: null });

    await expect(processTransactionalEmailQueue({ limit: 1 })).resolves.toEqual({ processed: 1, accepted: 0, failed: 1 });
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.admin.rpc).toHaveBeenLastCalledWith("transactional_email_finish_api", expect.objectContaining({ requested: expect.objectContaining({ outcome: "failed", error_code: "provider_configuration_missing", error_message: "Email provider configuration is missing.", retryable: true }) }));
  });

  it("records provider acceptance only after Resend returns an id", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    mocks.send.mockResolvedValue("provider-message-1");
    mocks.admin.rpc
      .mockResolvedValueOnce({ data: row, error: null })
      .mockResolvedValueOnce({ data: { ...row, status: "provider_accepted" }, error: null });

    await expect(processTransactionalEmailQueue({ limit: 1 })).resolves.toEqual({ processed: 1, accepted: 1, failed: 0 });
    expect(mocks.admin.rpc).toHaveBeenLastCalledWith("transactional_email_finish_api", expect.objectContaining({ requested: expect.objectContaining({ outcome: "provider_accepted", provider_message_id: "provider-message-1" }) }));
  });
});

describe("catalogue template fallback", () => {
  it("creates a published application-renderer version when no DB version exists", async () => {
    const templateQueries = [
      query({ data: null, error: null }),
      query({ data: { id: "template-1" }, error: null }),
    ];
    const versionQueries = [
      query({ data: null, error: null }),
      query({ data: null, error: null }),
      query({ data: { id: "version-1" }, error: null }),
    ];
    mocks.admin.from.mockImplementation((table: string) => table === "email_templates" ? templateQueries.shift() : versionQueries.shift());
    mocks.admin.rpc.mockResolvedValue({ data: { ...row, status: "queued" }, error: null });

    await expect(enqueueTransactionalEmail({
      templateKey: "booking-request-received",
      logicalIdempotencyKey: "booking:test-1",
      triggerKey: "booking.created",
      message: { to: "client@example.com", from: "Kahel Studio <hello@kahelstudio.com>", subject: "Booking received", html: "<p>Received</p>", text: "Received" },
    })).resolves.toMatchObject({ id: "message-1", status: "queued" });

    const insertedVersion = versionQueries.length === 0;
    expect(insertedVersion).toBe(true);
    expect(mocks.admin.rpc).toHaveBeenCalledWith("transactional_email_enqueue", expect.objectContaining({ requested: expect.objectContaining({ template_version_id: "version-1" }) }));
  });
});

function query(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ["select", "eq", "not", "order", "limit", "upsert", "insert"]) chain[method] = vi.fn(() => chain);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.single = vi.fn().mockResolvedValue(result);
  return chain;
}
