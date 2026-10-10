import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  signInWithPassword: vi.fn(),
  assurance: vi.fn(),
  maybeSingle: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ auth: { getUser: mocks.getUser, signInWithPassword: mocks.signInWithPassword, mfa: { getAuthenticatorAssuranceLevel: mocks.assurance } } }),
}));
vi.mock("@/lib/server/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }),
      insert: mocks.insert,
    }),
  }),
}));

import { getStaffPrincipal, signInStaff } from "@/lib/server/staff-auth";

const request = new Request("https://kahelstudio.com/api/staff/me", { headers: { "x-staff-access-token": "token" } });

describe("approved staff principals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.KAHEL_STAFF_EMAILS = "owner@example.com";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_PUBLISHABLE_KEY = "publishable-key";
    process.env.AUTH_REDIRECT_URL = "https://kahelstudio.com/reset-password";
    process.env.KAHEL_AUTH_DISABLED = "false";
    (process.env.APP_ENV as string) = "test";
    mocks.assurance.mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal1" }, error: null });
  });

  it.each([
    ["super_admin", ["bookings.manage", "galleries.publish"]],
    ["admin", ["bookings.manage", "galleries.publish"]],
    ["staff", ["loyalty.read"]],
  ] as const)("preserves an approved active %s profile", async (role, expectedPermissions) => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "staff-id", email: "approved@example.com" } }, error: null });
    mocks.maybeSingle.mockResolvedValue({ data: { user_id: "staff-id", role, active: true, can_manage_bookings: false, can_manage_loyalty: false, can_manage_rewards: false, can_manage_galleries: false }, error: null });

    const principal = await getStaffPrincipal(request);

    expect(principal?.role).toBe(role);
    expect(principal?.permissions).toEqual(expect.arrayContaining([...expectedPermissions]));
  });

  it("rejects an inactive staff profile", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "staff-id", email: "approved@example.com" } }, error: null });
    mocks.maybeSingle.mockResolvedValue({ data: { user_id: "staff-id", role: "staff", active: false }, error: null });
    await expect(getStaffPrincipal(request)).resolves.toBeNull();
  });

  it.each(["unknown@gmail.com", "containskahelstudio@gmail.com"])("rejects unapproved identity %s without creating a profile", async (email) => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "unknown-id", email } }, error: null });
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(getStaffPrincipal(request)).resolves.toBeNull();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("rejects a malformed authenticated identity", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "staff-id", email: "not-an-email" } }, error: null });
    await expect(getStaffPrincipal(request)).resolves.toBeNull();
    expect(mocks.maybeSingle).not.toHaveBeenCalled();
  });

  it("returns forbidden after valid credentials for an unapproved account", async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { session: { access_token: "token" }, user: { id: "unknown-id", email: "unknown@gmail.com" } }, error: null });
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(signInStaff("unknown@gmail.com", "valid-password")).resolves.toEqual({ session: null, forbidden: true });
  });
});
