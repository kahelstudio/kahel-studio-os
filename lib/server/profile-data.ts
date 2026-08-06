import "server-only";

import { cookies } from "next/headers";
import { getSupabaseAdmin, getSupabaseAuthClient } from "./supabase-admin";
import { authenticationDisabled } from "./staff-auth";

export type MyProfile = {
  userId: string;
  email: string;
  displayName: string;
  initials: string;
  jobTitle: string;
  adminRole: "super_admin" | "admin" | "staff";
  employeeRef: string | null;
  hiredAt: string | null;
  gov: {
    sss: string | null;
    tin: string | null;
    philhealth: string | null;
    pagibig: string | null;
  };
};

function maskEnd(value: string | null, visibleChars = 4, maskChar = "•"): string {
  if (!value) return "—";
  const clean = value.replace(/[-\s]/g, "");
  if (clean.length <= visibleChars) return value;
  const masked = maskChar.repeat(clean.length - visibleChars) + clean.slice(-visibleChars);
  return masked;
}

function formatHiredAt(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-PH", { month: "long", year: "numeric" });
}

export async function getMyProfile(): Promise<MyProfile | null> {
  const admin = getSupabaseAdmin();

  if (authenticationDisabled()) {
    const { data: sp } = await admin.from("staff_profiles").select("user_id,role,display_name").limit(1).single();
    const { data: pe } = await admin.from("payroll_employees").select("initials,name,role,employee_ref,sss_number,tin,philhealth_number,pagibig_number,hired_at").limit(1).maybeSingle();
    return {
      userId: sp?.user_id ?? "dev",
      email: "development@kahel.local",
      displayName: pe?.name ?? sp?.display_name ?? "Developer",
      initials: pe?.initials ?? "DV",
      jobTitle: pe?.role ?? "Developer",
      adminRole: (sp?.role as MyProfile["adminRole"]) ?? "super_admin",
      employeeRef: pe?.employee_ref ?? null,
      hiredAt: pe?.hired_at ? formatHiredAt(pe.hired_at) : null,
      gov: {
        sss: pe?.sss_number ? maskEnd(pe.sss_number) : null,
        tin: pe?.tin ? maskEnd(pe.tin) : null,
        philhealth: pe?.philhealth_number ? maskEnd(pe.philhealth_number) : null,
        pagibig: pe?.pagibig_number ? maskEnd(pe.pagibig_number, 4) : null,
      },
    };
  }

  const store = await cookies();
  const accessToken = store.get("kahel_staff_access_token")?.value;
  if (!accessToken) return null;

  const { data: userData, error: userError } = await getSupabaseAuthClient(accessToken).auth.getUser();
  if (userError || !userData.user) return null;
  const user = userData.user;

  const [{ data: sp }, { data: pe }] = await Promise.all([
    admin.from("staff_profiles").select("user_id,role,display_name").eq("user_id", user.id).maybeSingle(),
    admin.from("payroll_employees").select("initials,name,role,employee_ref,sss_number,tin,philhealth_number,pagibig_number,hired_at").eq("staff_id", user.id).maybeSingle(),
  ]);

  return {
    userId: user.id,
    email: user.email ?? "",
    displayName: pe?.name ?? sp?.display_name ?? user.email ?? "",
    initials: pe?.initials ?? (sp?.display_name ?? "??").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
    jobTitle: pe?.role ?? sp?.role ?? "Staff",
    adminRole: (sp?.role as MyProfile["adminRole"]) ?? "staff",
    employeeRef: pe?.employee_ref ?? null,
    hiredAt: pe?.hired_at ? formatHiredAt(pe.hired_at) : null,
    gov: {
      sss: pe?.sss_number ? maskEnd(pe.sss_number) : null,
      tin: pe?.tin ? maskEnd(pe.tin) : null,
      philhealth: pe?.philhealth_number ? maskEnd(pe.philhealth_number) : null,
      pagibig: pe?.pagibig_number ? maskEnd(pe.pagibig_number, 4) : null,
    },
  };
}
