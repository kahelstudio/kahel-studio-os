import { redirect } from "next/navigation";
import { MessagesWorkspace } from "@/components/messages/messages-workspace";
import { getCurrentStaffPrincipal } from "@/lib/server/current-staff";
import { isFailedMessage, messageSummary, parseMessageFilters } from "@/lib/messages";
import { getMessages } from "@/lib/server/messages-data";

export default async function FailedPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const principal = await getCurrentStaffPrincipal();
  if (!principal) redirect("/login");
  const params = await searchParams;
  const filters = { ...parseMessageFilters(params), status: "all" as const };
  const result = await getMessages(principal, { ...filters, status: "all" });
  result.messages = result.messages.filter((message) => isFailedMessage(message));
  result.summary = messageSummary(result.messages);
  return <MessagesWorkspace result={result} filters={filters} failedView canRetry={["admin", "super_admin"].includes(principal.role)} />;
}
