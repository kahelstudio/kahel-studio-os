import { afterEach, describe, expect, it, vi } from "vitest";
import { Webhook } from "svix";

const mocks = vi.hoisted(() => ({ record: vi.fn() }));
vi.mock("@/lib/server/transactional-email-service", () => ({ recordResendProviderEvent: mocks.record }));
import { POST } from "@/app/api/resend/webhook/route";

afterEach(() => {
  vi.unstubAllEnvs();
  mocks.record.mockReset();
});

describe("Resend webhook", () => {
  it("verifies the raw body with Svix and stores only normalized fields", async () => {
    const secret = `whsec_${Buffer.from("test webhook signing secret").toString("base64")}`;
    vi.stubEnv("RESEND_WEBHOOK_SECRET", secret);
    const body = JSON.stringify({ type: "email.delivered", created_at: "2026-08-13T12:00:00Z", data: { email_id: "email_123", to: ["sensitive@example.com"] } });
    const id = "msg_test";
    const timestamp = new Date();
    const signature = new Webhook(secret).sign(id, timestamp, body);
    const response = await POST(new Request("https://kahelstudio.com/api/resend/webhook", { method: "POST", body, headers: { "svix-id": id, "svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)), "svix-signature": signature } }));
    expect(response.status).toBe(200);
    expect(mocks.record).toHaveBeenCalledWith({ eventId: id, type: "email.delivered", providerMessageId: "email_123", occurredAt: "2026-08-13T12:00:00.000Z" });
  });

  it("rejects an invalid signature", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", `whsec_${Buffer.from("test webhook signing secret").toString("base64")}`);
    const response = await POST(new Request("https://kahelstudio.com/api/resend/webhook", { method: "POST", body: "{}" }));
    expect(response.status).toBe(401);
    expect(mocks.record).not.toHaveBeenCalled();
  });
});
