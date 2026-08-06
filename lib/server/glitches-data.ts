/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseAdmin } from "./supabase-admin";

export type GlitchRow = {
  id: string;
  reference: string;
  title: string;
  area: string;
  reporter: string;
  severity: string;
  status: string;
  reportedAt: string;
  resolvedAt: string | null;
};

export async function getGlitches(status?: string): Promise<GlitchRow[]> {
  try {
    const admin = getSupabaseAdmin();

    let query = admin
      .from("glitches")
      .select("id, reference, title, area, reporter, severity, status, reported_at, resolved_at")
      .order("reported_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query.limit(200);

    if (error) throw error;

    return (data ?? []).map((g: any) => ({
      id: g.id,
      reference: g.reference,
      title: g.title,
      area: g.area,
      reporter: g.reporter,
      severity: g.severity,
      status: g.status,
      reportedAt: g.reported_at,
      resolvedAt: g.resolved_at,
    }));
  } catch (error) {
    console.error("getGlitches: table not available", (error as Error).message);
    return [];
  }
}
