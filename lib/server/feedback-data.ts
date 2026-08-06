import { getSupabaseAdmin } from "./supabase-admin";

export type FeedbackReport = {
  id: string;
  iid: string;
  title: string;
  summary: string | null;
  app: string;
  kind: string;
  status: string;
  priority: string;
  submittedAt: string;
  checked: boolean;
};

export async function getFeedbackReports(status?: string): Promise<FeedbackReport[]> {
  try {
    const admin = getSupabaseAdmin();

    let query = admin
      .from("feedback_reports")
      .select("id, iid, title, summary, app, kind, status, priority, submitted_at, checked")
      .order("submitted_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query.limit(200);

    if (error) throw error;

    return (data ?? []).map((f: any) => ({
      id: f.id,
      iid: f.iid,
      title: f.title,
      summary: f.summary,
      app: f.app,
      kind: f.kind,
      status: f.status,
      priority: f.priority,
      submittedAt: f.submitted_at,
      checked: f.checked,
    }));
  } catch (error) {
    console.error("getFeedbackReports: table not available", (error as Error).message);
    return [];
  }
}
