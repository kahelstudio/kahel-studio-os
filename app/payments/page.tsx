export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { PaymentsWorkspace } from "@/components/payments/payments-workspace";
import { getCurrentStaffPrincipal } from "@/lib/server/current-staff";
import { getPaymentWorkspace } from "@/lib/server/payments-data";

export default async function PaymentsPage() {
  const principal = await getCurrentStaffPrincipal();
  if (!principal) redirect("/login");
  let workspace;
  try {
    workspace = await getPaymentWorkspace();
  } catch {
    workspace = null;
  }
  if (!workspace) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
        <p className="font-display text-xl font-semibold text-[var(--color-text-primary)]">Unable to load payments</p>
        <p className="text-sm text-[var(--color-text-secondary)]">Check that your Supabase credentials are correctly configured in <code className="rounded bg-[var(--color-surface-muted)] px-1">.env.local</code>.</p>
      </div>
    );
  }
  return <PaymentsWorkspace initialWorkspace={workspace} principal={{ email: principal.email, role: principal.role }} />;
}
