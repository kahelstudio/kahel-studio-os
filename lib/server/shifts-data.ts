import { getSupabaseAdmin } from "./supabase-admin";

export type ShiftRow = {
  id: string;
  dayOfWeek: number;
  initials: string;
  name: string;
  role: string;
  timeDescription: string | null;
  location: string;
  weekStart: string;
};

export async function getShifts(weekStart: string): Promise<ShiftRow[]> {
  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from("shifts")
    .select("id, day_of_week, initials, name, role, time_description, location, week_start")
    .eq("week_start", weekStart)
    .order("day_of_week", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((s: any) => ({
    id: s.id,
    dayOfWeek: s.day_of_week,
    initials: s.initials,
    name: s.name,
    role: s.role,
    timeDescription: s.time_description,
    location: s.location,
    weekStart: s.week_start,
  }));
}
