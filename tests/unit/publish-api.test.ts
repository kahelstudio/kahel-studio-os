import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const store = new Map<string, string>();
  return {
    getStaffPrincipal: vi.fn(),
    hasTrustedOrigin: vi.fn(),
    getCloudflareContext: vi.fn(),
    kvGet: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    kvPut: vi.fn((key: string, value: string) => Promise.resolve(store.set(key, value) && undefined)),
    kvDelete: vi.fn((key: string) => Promise.resolve(store.delete(key) && undefined)),
    store,
  };
});

vi.mock("@/lib/server/staff-auth", () => ({ getStaffPrincipal: mocks.getStaffPrincipal }));
vi.mock("@/lib/server/customer-auth", () => ({ hasTrustedOrigin: mocks.hasTrustedOrigin }));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: mocks.getCloudflareContext }));

import { POST } from "@/app/api/publish/route";

const DEPLOY_HOOK = "https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/test-hook";
const staffPrincipal = { userId: "staff-1", email: "staff@kahelstudio.com", role: "admin", permissions: [], accessToken: "token" };

function bearerRequest(token = "staff-token") {
  return new Request("https://kahelstudio.com/api/publish", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
}

function cookieRequest(origin = "https://kahelstudio.com") {
  return new Request("https://kahelstudio.com/api/publish", { method: "POST", headers: { Origin: origin } });
}

describe("POST /api/publish", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 201 })));
    process.env.PAGES_DEPLOY_HOOK = DEPLOY_HOOK;
    mocks.getStaffPrincipal.mockResolvedValue(staffPrincipal);
    mocks.hasTrustedOrigin.mockReturnValue(true);
    mocks.getCloudflareContext.mockResolvedValue({
      env: { PUBLISH_KV: { get: mocks.kvGet, put: mocks.kvPut, delete: mocks.kvDelete } },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    mocks.store.clear();
    delete process.env.PAGES_DEPLOY_HOOK;
  });

  it("rejects cookie-authenticated calls from an untrusted origin", async () => {
    mocks.hasTrustedOrigin.mockReturnValue(false);
    const response = await POST(cookieRequest("https://evil.example"));
    expect(response.status).toBe(403);
    expect(mocks.getStaffPrincipal).not.toHaveBeenCalled();
  });

  it("skips the origin check for Bearer calls and still rejects invalid tokens", async () => {
    mocks.hasTrustedOrigin.mockReturnValue(false);
    mocks.getStaffPrincipal.mockResolvedValue(null);
    const response = await POST(bearerRequest("bad-token"));
    expect(response.status).toBe(401);
    expect(mocks.getStaffPrincipal).toHaveBeenCalledOnce();
    const forwarded = mocks.getStaffPrincipal.mock.calls[0][0] as Request;
    expect(forwarded.headers.get("x-staff-access-token")).toBe("bad-token");
  });

  it("rejects when no staff session is present", async () => {
    mocks.getStaffPrincipal.mockResolvedValue(null);
    const response = await POST(cookieRequest());
    expect(response.status).toBe(401);
  });

  it("returns 503 when the KV binding or deploy hook secret is missing", async () => {
    mocks.getCloudflareContext.mockResolvedValue({ env: {} });
    const response = await POST(bearerRequest());
    expect(response.status).toBe(503);
    delete process.env.PAGES_DEPLOY_HOOK;
    mocks.getCloudflareContext.mockResolvedValue({
      env: { PUBLISH_KV: { get: mocks.kvGet, put: mocks.kvPut, delete: mocks.kvDelete } },
    });
    expect((await POST(bearerRequest())).status).toBe(503);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("coalesces a publish burst: pending build returns queued without firing the hook", async () => {
    mocks.store.set("pages-build:pending", new Date().toISOString());
    const response = await POST(bearerRequest());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ queued: true });
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
    expect(mocks.kvPut).not.toHaveBeenCalled();
  });

  it("fires the deploy hook once when nothing is pending", async () => {
    const response = await POST(bearerRequest());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(vi.mocked(fetch)).toHaveBeenCalledOnce();
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(DEPLOY_HOOK);
    expect(vi.mocked(fetch).mock.calls[0][1]).toMatchObject({ method: "POST" });
    expect(mocks.kvPut).toHaveBeenCalledWith("pages-build:pending", expect.any(String), { expirationTtl: 60 });
    expect(mocks.kvDelete).not.toHaveBeenCalled();
  });

  it("releases the debounce lock when the deploy hook fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 500 })));
    const response = await POST(bearerRequest());
    expect(response.status).toBe(502);
    expect(mocks.kvDelete).toHaveBeenCalledWith("pages-build:pending");
  });

  it("releases the debounce lock when the deploy hook is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const response = await POST(bearerRequest());
    expect(response.status).toBe(502);
    expect(mocks.kvDelete).toHaveBeenCalledWith("pages-build:pending");
  });

  it("authenticates the staff session cookie without an Authorization header", async () => {
    const response = await POST(cookieRequest());
    expect(response.status).toBe(200);
    const forwarded = mocks.getStaffPrincipal.mock.calls[0][0] as Request;
    expect(forwarded).toBeInstanceOf(Request);
    expect(forwarded.headers.get("x-staff-access-token")).toBeNull();
  });
});
