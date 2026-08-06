/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseAdmin } from "./supabase-admin";

export type RecruitmentCandidate = {
  id: string;
  initials: string;
  name: string;
  roleApplied: string;
  roleId: string | null;
  roleTitle: string | null;
  notes: string | null;
  source: string | null;
  stage: string;
  createdAt: string;
};

export type RecruitmentRole = {
  id: string;
  title: string;
  type: string;
  applicantCount: number;
  isOpen: boolean;
  description: string | null;
};

export type HireRow = {
  id: string;
  initials: string;
  name: string;
  role: string;
  tasksDone: number;
  tasksTotal: number;
  status: string;
  createdAt: string;
};

export type DepartureRow = {
  id: string;
  initials: string;
  name: string;
  role: string;
  tasksDone: number;
  tasksTotal: number;
  status: string;
  createdAt: string;
};

export async function getRecruitmentCandidates(): Promise<RecruitmentCandidate[]> {
  try {
    const admin = getSupabaseAdmin();

    const { data, error } = await admin
      .from("recruitment_candidates")
      .select(`
        id,
        initials,
        name,
        role_applied,
        role_id,
        notes,
        source,
        stage,
        created_at,
        recruitment_roles:role_id ( title )
      `)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;

    return (data ?? []).map((c: any) => ({
      id: c.id,
      initials: c.initials,
      name: c.name,
      roleApplied: c.role_applied,
      roleId: c.role_id,
      roleTitle: c.recruitment_roles?.title ?? null,
      notes: c.notes,
      source: c.source,
      stage: c.stage,
      createdAt: c.created_at,
    }));
  } catch (error) {
    console.error("getRecruitmentCandidates: table not available", (error as Error).message);
    return [];
  }
}

export async function getRecruitmentRoles(): Promise<RecruitmentRole[]> {
  try {
    const admin = getSupabaseAdmin();

    const { data, error } = await admin
      .from("recruitment_roles")
      .select("id, title, type, applicant_count, is_open, description")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data ?? []).map((r: any) => ({
      id: r.id,
      title: r.title,
      type: r.type,
      applicantCount: r.applicant_count,
      isOpen: r.is_open,
      description: r.description,
    }));
  } catch (error) {
    console.error("getRecruitmentRoles: table not available", (error as Error).message);
    return [];
  }
}

export async function getHires(): Promise<HireRow[]> {
  try {
    const admin = getSupabaseAdmin();

    const { data, error } = await admin
      .from("recruitment_hires")
      .select("id, initials, name, role, tasks_done, tasks_total, status, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data ?? []).map((h: any) => ({
      id: h.id,
      initials: h.initials,
      name: h.name,
      role: h.role,
      tasksDone: h.tasks_done,
      tasksTotal: h.tasks_total,
      status: h.status,
      createdAt: h.created_at,
    }));
  } catch (error) {
    console.error("getHires: table not available", (error as Error).message);
    return [];
  }
}

export async function getDepartures(): Promise<DepartureRow[]> {
  try {
    const admin = getSupabaseAdmin();

    const { data, error } = await admin
      .from("recruitment_departures")
      .select("id, initials, name, role, tasks_done, tasks_total, status, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data ?? []).map((d: any) => ({
      id: d.id,
      initials: d.initials,
      name: d.name,
      role: d.role,
      tasksDone: d.tasks_done,
      tasksTotal: d.tasks_total,
      status: d.status,
      createdAt: d.created_at,
    }));
  } catch (error) {
    console.error("getDepartures: table not available", (error as Error).message);
    return [];
  }
}
