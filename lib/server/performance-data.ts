import { getSupabaseAdmin } from "./supabase-admin";

export type PerformanceReview = {
  id: string;
  staffId: string | null;
  initials: string;
  name: string;
  role: string;
  cycle: string;
  rating: number | null;
  status: string;
  notes: string | null;
};

export type PerformanceGoal = {
  id: string;
  label: string;
  owner: string;
  progressPct: number;
  detail: string | null;
};

export async function getPerformanceReviews(): Promise<PerformanceReview[]> {
  try {
    const admin = getSupabaseAdmin();

    const { data, error } = await admin
      .from("performance_reviews")
      .select("id, staff_id, initials, name, role, cycle, rating, status, notes")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;

    return (data ?? []).map((r: any) => ({
      id: r.id,
      staffId: r.staff_id,
      initials: r.initials,
      name: r.name,
      role: r.role,
      cycle: r.cycle,
      rating: r.rating,
      status: r.status,
      notes: r.notes,
    }));
  } catch (error) {
    console.error("getPerformanceReviews: table not available", (error as Error).message);
    return [];
  }
}

export async function getPerformanceGoals(): Promise<PerformanceGoal[]> {
  try {
    const admin = getSupabaseAdmin();

    const { data, error } = await admin
      .from("performance_goals")
      .select("id, label, owner, progress_pct, detail")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data ?? []).map((g: any) => ({
      id: g.id,
      label: g.label,
      owner: g.owner,
      progressPct: g.progress_pct,
      detail: g.detail,
    }));
  } catch (error) {
    console.error("getPerformanceGoals: table not available", (error as Error).message);
    return [];
  }
}
