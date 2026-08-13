import { redirect } from "next/navigation";
import { MessagesWorkspace } from "@/components/messages/messages-workspace";
import { getCurrentStaffPrincipal } from "@/lib/server/current-staff";
import { parseMessageFilters } from "@/lib/messages";
import { getMessages } from "@/lib/server/messages-data";

export default async function TransactionalPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const principal = await getCurrentStaffPrincipal();
  if (!principal) redirect("/login");
  const filters = parseMessageFilters(await searchParams);
  const result = await getMessages(principal, filters);
  return <MessagesWorkspace result={result} filters={filters} failedView={false} canRetry={["admin", "super_admin"].includes(principal.role)} />;
}
