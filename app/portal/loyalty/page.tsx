import { LoyaltyDashboard, type LoyaltySummary } from "@/components/client-portal/loyalty-dashboard";
import { requireCustomerIdentity } from "@/lib/server/customer-auth";
import { getLoyaltySummary } from "@/lib/server/loyalty";

export default async function PortalLoyaltyPage() {
  const identity = await requireCustomerIdentity("/portal/loyalty");
  const summary = await getLoyaltySummary(identity.clientId);
  return <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14"><LoyaltyDashboard summary={summary as LoyaltySummary} /></main>;
}
