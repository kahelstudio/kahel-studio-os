export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { RegisterWorkspace } from "@/components/pos/register-workspace";
import { getCurrentStaffPrincipal } from "@/lib/server/current-staff";
import { getRegisterWorkspace } from "@/lib/server/register-data";

export default async function RegisterPage() {
  const principal = await getCurrentStaffPrincipal();
  if (!principal) redirect("/login");
  const workspace = await getRegisterWorkspace();
  return <RegisterWorkspace initialWorkspace={workspace} principal={{ userId: principal.userId, email: principal.email, role: principal.role }} />;
}
