import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getSupabaseAdmin: vi.fn() }));

vi.mock("@/lib/server/supabase-admin", () => ({ getSupabaseAdmin: mocks.getSupabaseAdmin }));

import { getActiveStaffDirectory } from "@/lib/server/staff-directory-data";

describe("active staff directory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps active profiles to payroll details and safe fallbacks", async () => {
    const profileOrder = vi.fn().mockResolvedValue({
      data: [
        { user_id: "user-1", display_name: "Eusebio Barrun", role: "super_admin" },
        { user_id: "user-2", display_name: "Ana Cruz", role: "staff" },
      ],
      error: null,
    });
    const profileActive = vi.fn(() => ({ order: profileOrder }));
    const employeeActive = vi.fn().mockResolvedValue({
      data: [{ staff_id: "user-1", initials: "EB", role: "Lead photographer" }],
      error: null,
    });
    const from = vi.fn((table: string) => table === "staff_profiles"
      ? { select: vi.fn(() => ({ eq: profileActive })) }
      : { select: vi.fn(() => ({ eq: employeeActive })) });
    mocks.getSupabaseAdmin.mockReturnValue({ from });

    await expect(getActiveStaffDirectory()).resolves.toEqual([
      { id: "user-1", displayName: "Eusebio Barrun", initials: "EB", role: "Lead photographer" },
      { id: "user-2", displayName: "Ana Cruz", initials: "AC", role: "Staff" },
    ]);
    expect(profileActive).toHaveBeenCalledWith("active", true);
    expect(employeeActive).toHaveBeenCalledWith("status", "active");
    expect(profileOrder).toHaveBeenCalledWith("display_name");
  });

  it("fails rather than presenting an incomplete roster", async () => {
    const failure = new Error("staff query failed");
    const from = vi.fn((table: string) => table === "staff_profiles"
      ? { select: vi.fn(() => ({ eq: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: null, error: failure }) })) })) }
      : { select: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) })) });
    mocks.getSupabaseAdmin.mockReturnValue({ from });

    await expect(getActiveStaffDirectory()).rejects.toBe(failure);
  });
});
