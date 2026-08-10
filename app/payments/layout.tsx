import { AppShell } from "@/components/shell/app-shell";
import { redirect } from "next/navigation";
import { getCurrentStaffPrincipal } from "@/lib/server/current-staff";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const principal = await getCurrentStaffPrincipal();
  if (!principal || principal.role === "staff") redirect("/os");
  return <AppShell appId="payments">{children}</AppShell>;
}
