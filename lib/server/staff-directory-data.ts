import "server-only";

import { getSupabaseAdmin } from "./supabase-admin";

export type StaffDirectoryEntry = {
  id: string;
  displayName: string;
  initials: string;
  role: string;
};

const ADMIN_ROLE_LABELS: Record<string, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  staff: "Staff",
};

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "KS";
  return `${parts[0][0]}${parts.length > 1 ? parts.at(-1)![0] : parts[0][1] ?? ""}`.toUpperCase();
}

export async function getActiveStaffDirectory(): Promise<StaffDirectoryEntry[]> {
  const admin = getSupabaseAdmin();
  const [profilesResult, employeesResult] = await Promise.all([
    admin.from("staff_profiles").select("user_id,display_name,role").eq("active", true).order("display_name"),
    admin.from("payroll_employees").select("staff_id,initials,role").eq("status", "active"),
  ]);

  if (profilesResult.error) throw profilesResult.error;
  if (employeesResult.error) throw employeesResult.error;

  const employeesByStaffId = new Map(
    (employeesResult.data ?? [])
      .filter((employee) => employee.staff_id)
      .map((employee) => [employee.staff_id!, employee]),
  );

  return (profilesResult.data ?? []).map((profile) => {
    const employee = employeesByStaffId.get(profile.user_id);
    return {
      id: profile.user_id,
      displayName: profile.display_name,
      initials: employee?.initials?.trim() || initialsFor(profile.display_name),
      role: employee?.role?.trim() || ADMIN_ROLE_LABELS[profile.role] || "Staff",
    };
  });
}
