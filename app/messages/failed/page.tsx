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
  const base = await getMessages(principal, { ...filters, status: "all" });
  const filteredMessages = base.messages.filter((message) => isFailedMessage(message));
  const result = { ...base, messages: filteredMessages, summary: messageSummary(filteredMessages) };
  return <MessagesWorkspace result={result} filters={filters} failedView canRetry={["admin", "super_admin"].includes(principal.role)} />;
}
