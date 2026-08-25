export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { PromoCodesWorkspace } from "@/components/marketing/promo-codes-workspace";
import { getCurrentStaffPrincipal } from "@/lib/server/current-staff";
import { getPromoCodesWorkspace } from "@/lib/server/promo-codes-data";

export default async function PromoCodesPage() {
  const principal = await getCurrentStaffPrincipal();
  if (!principal) redirect("/sign-in");
  const data = await getPromoCodesWorkspace(principal);
  return <PromoCodesWorkspace initialData={data} />;
}
