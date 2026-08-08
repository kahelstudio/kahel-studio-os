import { beforeEach, describe, expect, it } from "vitest";
import { staffEmailAuthorized } from "@/lib/server/staff-auth";

describe("staff email authorization", () => {
  beforeEach(() => {
    process.env.KAHEL_STAFF_EMAILS = "owner@example.com";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_PUBLISHABLE_KEY = "publishable-key";
    process.env.AUTH_REDIRECT_URL = "https://kahelstudio.com/reset-password";
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
});
