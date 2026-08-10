export const dynamic = "force-dynamic";

import { ApprovalsClient } from "./approvals-client";
import { getApprovalDashboard } from "@/lib/server/approvals-data";
import { getCurrentStaffPrincipal } from "@/lib/server/current-staff";

export default async function ApprovalsPage() {
  const principal = await getCurrentStaffPrincipal();
  if (!principal) return <ApprovalsClient initialDashboard={null} initialError="Your session is unavailable. Sign in again to open Approvals." />;
  let dashboard = null;
  let initialError: string | null = null;
  try { dashboard = await getApprovalDashboard(principal); }
  catch (error) { console.error("Unable to load approvals", error); initialError = "Approvals could not be loaded. Confirm the approval database migration has been applied, then try again."; }
  return <ApprovalsClient initialDashboard={dashboard} initialError={initialError} />;
}
