import { AppShell } from "@/components/shell/app-shell";
import { getCurrentStaffPrincipal } from "@/lib/server/current-staff";
import { getPendingApprovalCount } from "@/lib/server/approvals-data";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const principal = await getCurrentStaffPrincipal();
  const pending = principal ? await getPendingApprovalCount(principal).catch(() => 0) : 0;
  return <AppShell appId="approvals" navCounts={{ "my-approvals": pending }}>{children}</AppShell>;
}
