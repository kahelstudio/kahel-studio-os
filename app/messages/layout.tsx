import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { getCurrentStaffPrincipal } from "@/lib/server/current-staff";
import { canAccessMessages } from "@/lib/messages";

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const principal = await getCurrentStaffPrincipal();
  if (!principal) redirect("/login");
  if (!canAccessMessages(principal)) redirect("/os");
  return <AppShell appId="messages">{children}</AppShell>;
}
