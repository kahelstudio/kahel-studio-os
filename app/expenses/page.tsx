export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { ExpensesWorkspace } from "@/components/expenses/expenses-workspace";
import { getCurrentStaffPrincipal } from "@/lib/server/current-staff";
import { getExpenseWorkspace } from "@/lib/server/expenses-data";

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const principal = await getCurrentStaffPrincipal();
  if (!principal) redirect("/sign-in");
  const data = await getExpenseWorkspace(principal);
  const params = await searchParams;
  const query = (key: string) => typeof params[key] === "string" ? params[key] : "";
  return <ExpensesWorkspace initialData={data} currentUserId={principal.userId} initialFilters={{ view: query("view"), q: query("q"), status: query("status"), project: query("project"), receipt: query("receipt"), special: query("filter"), reference: query("ref") }} />;
}
