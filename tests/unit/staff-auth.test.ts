import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authenticationDisabled, staffEmailAuthorized } from "@/lib/server/staff-auth";
import { POST as changePassword } from "@/app/api/staff/password-reset/route";

describe("staff email authorization", () => {
  beforeEach(() => {
    process.env.KAHEL_STAFF_EMAILS = "owner@example.com";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_PUBLISHABLE_KEY = "publishable-key";
    process.env.AUTH_REDIRECT_URL = "https://kahelstudio.com/reset-password";
    process.env.KAHEL_AUTH_DISABLED = "false";
    (process.env.APP_ENV as string) = "test";
  });

  it("authorizes the Kahel Studio work domain", () => {
    expect(staffEmailAuthorized("eusebio.barrun@kahelstudio.com")).toBe(true);
  });

  it("still authorizes explicitly configured addresses", () => {
    expect(staffEmailAuthorized("owner@example.com")).toBe(true);
  });

  it("rejects unrelated domains", () => {
    expect(staffEmailAuthorized("person@example.com")).toBe(false);
  });

  it("never disables authentication in production", () => {
    (process.env.APP_ENV as string) = "production";
    process.env.KAHEL_AUTH_DISABLED = "true";
    expect(authenticationDisabled()).toBe(false);
  });

  it("allows explicit auth bypass for local production-build tests", () => {
    (process.env.APP_ENV as string) = "test";
    process.env.KAHEL_AUTH_DISABLED = "true";
    expect(authenticationDisabled()).toBe(true);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("requires an authenticated session to change a password", async () => {
    // The password below clears the composition rules, so the route reaches the
    // breach lookup. Stubbed so the unit suite never depends on the network.
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, text: async () => "" }) as unknown as Response));
    const request = new Request("https://kahelstudio.com/api/staff/password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "ValidPassword1!" }),
    });

    const response = await changePassword(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Sign in again before changing your password." });
  });
});
