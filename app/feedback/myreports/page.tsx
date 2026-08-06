export const dynamic = "force-dynamic";

import { FeedbackReportsClient } from "./feedback-reports-client";
import { getFeedbackReports } from "@/lib/server/feedback-data";

export default async function FeedbackMyReportsPage() {
  const reports = await getFeedbackReports();

  return <FeedbackReportsClient reports={reports} />;
}
