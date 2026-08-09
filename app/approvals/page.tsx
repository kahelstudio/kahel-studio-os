export const dynamic = "force-dynamic";

import { ApprovalsClient } from "./approvals-client";
import { getPendingApprovals } from "@/lib/server/approvals-data";

export default async function ApprovalsPage() {
  const items = await getPendingApprovals().catch(() => []);
  return <ApprovalsClient initialItems={items} />;
}
