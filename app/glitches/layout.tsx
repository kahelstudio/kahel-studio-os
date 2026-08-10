import { AppShell } from "@/components/shell/app-shell";
import { getCurrentStaffPrincipal } from "@/lib/server/current-staff";
import { getGlitchNavigationCounts } from "@/lib/server/glitches-data";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const principal = await getCurrentStaffPrincipal();
  const counts = principal ? await getGlitchNavigationCounts(principal).catch(() => ({})) : {};
  return <AppShell appId="glitches" navCounts={counts}>{children}</AppShell>;
}
