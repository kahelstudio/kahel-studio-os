export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { PaymentsWorkspace } from "@/components/payments/payments-workspace";
import { getCurrentStaffPrincipal } from "@/lib/server/current-staff";
import { getPaymentWorkspace } from "@/lib/server/payments-data";

export default async function PaymentsPage() {
  const principal = await getCurrentStaffPrincipal();
  if (!principal) redirect("/login");
  const workspace = await getPaymentWorkspace();
  return <PaymentsWorkspace initialWorkspace={workspace} principal={{ email: principal.email, role: principal.role }} />;
}
