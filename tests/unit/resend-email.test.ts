import { afterEach, describe, expect, it, vi } from "vitest";
import { sendResendEmail } from "@/lib/resend-email";

afterEach(() => vi.unstubAllGlobals());

describe("sendResendEmail", () => {
  it("sends the transactional email through Resend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "email_test" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendResendEmail("re_test", { to: "customer@example.com", from: "Kahel Studio <hello@kahelstudio.com>", replyTo: "hello@kahelstudio.com", subject: "Test", html: "<p>Test</p>", text: "Test", idempotencyKey: "test-key" })).resolves.toBe("email_test");
    expect(fetchMock).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({ method: "POST", headers: expect.objectContaining({ Authorization: "Bearer re_test", "Idempotency-Key": "test-key" }) }));
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({ to: ["customer@example.com"], reply_to: "hello@kahelstudio.com" });
  });

  it("throws the provider error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Domain not verified" }), { status: 403 })));
    await expect(sendResendEmail("re_test", { to: "customer@example.com", from: "hello@kahelstudio.com", subject: "Test", html: "<p>Test</p>", text: "Test" })).rejects.toThrow("Domain not verified");
  });
});
