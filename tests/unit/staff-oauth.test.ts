import { describe, expect, it } from "vitest";
import { createStaffOAuthStorage, oauthVerifierFromRequest, STAFF_OAUTH_VERIFIER_COOKIE } from "@/lib/server/staff-oauth";

describe("staff OAuth PKCE storage", () => {
  it("persists and restores the verifier through its callback cookie", async () => {
    const initial = createStaffOAuthStorage();
    await initial.storage.setItem(`${initial.storageKey}-code-verifier`, '"verifier/value"');

    const encoded = encodeURIComponent(initial.verifier()!);
    const request = new Request("https://kahelstudio.com/api/staff/oauth/google/callback", {
      headers: { cookie: `${STAFF_OAUTH_VERIFIER_COOKIE}=${encoded}` },
    });
    const restored = createStaffOAuthStorage(oauthVerifierFromRequest(request)!);

    expect(await restored.storage.getItem(`${restored.storageKey}-code-verifier`)).toBe('"verifier/value"');
  });

  it("rejects a malformed verifier cookie", () => {
    const request = new Request("https://kahelstudio.com/api/staff/oauth/google/callback", {
      headers: { cookie: `${STAFF_OAUTH_VERIFIER_COOKIE}=%` },
    });

    expect(oauthVerifierFromRequest(request)).toBeNull();
  });
});
