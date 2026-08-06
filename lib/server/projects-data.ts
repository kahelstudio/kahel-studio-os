/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseAdmin } from "./supabase-admin";

export type ProjectPipelineItem = {
  id: string;
  reference: string;
  title: string;
  client: string;
  status: string;
  stage: "pre" | "production" | "post";
  startsAt: string | null;
  completedAt: string | null;
};

export type ProjectGroupItem = {
  id: string;
  reference: string;
  title: string;
  client: string;
  status: string;
  postStage: "editing" | "review" | "culling" | "delivered";
  startsAt: string | null;
  completedAt: string | null;
};

export type ProjectDetail = {
  id: string;
  reference: string;
  title: string;
  description: string | null;
  status: string;
  client: string;
  clientId: string;
  bookingId: string | null;
  bookingRef: string | null;
  startsAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const PRE_STATUSES = ["inquiry", "quoted", "confirmed"];
const PRODUCTION_STATUSES = ["progress", "scheduled"];
const POST_STATUSES: Record<string, "editing" | "review" | "culling" | "delivered"> = {
  editing: "editing",
  review: "review",
  culling: "culling",
  delivered: "delivered",
  completed: "delivered",
};

function getProjectStage(status: string): ProjectPipelineItem["stage"] {
  if (PRE_STATUSES.includes(status)) return "pre";
  if (PRODUCTION_STATUSES.includes(status)) return "production";
  return "post";
}

export async function getProjectPipeline(): Promise<{ pre: ProjectPipelineItem[]; production: ProjectPipelineItem[]; post: ProjectPipelineItem[] }> {
  try {
    const admin = getSupabaseAdmin();

    const { data, error } = await admin
      .from("projects")
      .select(`
        id,
        reference,
        title,
        status,
        starts_at,
        completed_at,
        client_id,
        clients:client_id ( name )
      `)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;

    const all: ProjectPipelineItem[] = (data ?? []).map((p: any) => ({
      id: p.id,
      reference: p.reference,
      title: p.title,
      client: p.clients?.name ?? "Unknown",
      status: p.status,
      stage: getProjectStage(p.status),
      startsAt: p.starts_at,
      completedAt: p.completed_at,
    }));

    return {
      pre: all.filter((p) => p.stage === "pre"),
      production: all.filter((p) => p.stage === "production"),
      post: all.filter((p) => p.stage === "post"),
    };
  } catch (error) {
    console.error("getProjectPipeline: table not available", (error as Error).message);
    return { pre: [], production: [], post: [] };
  }
}

export async function getProjectGroups(): Promise<{ editing: ProjectGroupItem[]; review: ProjectGroupItem[]; culling: ProjectGroupItem[]; delivered: ProjectGroupItem[] }> {
  try {
    const admin = getSupabaseAdmin();

    const { data, error } = await admin
      .from("projects")
      .select(`
        id,
        reference,
        title,
        status,
        starts_at,
        completed_at,
        client_id,
        clients:client_id ( name )
      `)
      .in("status", ["editing", "review", "culling", "completed", "delivered"])
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;

    const all: ProjectGroupItem[] = (data ?? []).map((p: any) => ({
      id: p.id,
      reference: p.reference,
      title: p.title,
      client: p.clients?.name ?? "Unknown",
      status: p.status,
      postStage: POST_STATUSES[p.status] ?? "editing",
      startsAt: p.starts_at,
      completedAt: p.completed_at,
    }));

    return {
      editing: all.filter((p) => p.postStage === "editing"),
      review: all.filter((p) => p.postStage === "review"),
      culling: all.filter((p) => p.postStage === "culling"),
      delivered: all.filter((p) => p.postStage === "delivered"),
    };
  } catch (error) {
    console.error("getProjectGroups: table not available", (error as Error).message);
    return { editing: [], review: [], culling: [], delivered: [] };
  }
}

export async function getProjectByRef(ref: string): Promise<ProjectDetail | null> {
  try {
    const admin = getSupabaseAdmin();

    const { data, error } = await admin
      .from("projects")
      .select(`
        id,
        reference,
        title,
        description,
        status,
        client_id,
        booking_id,
        starts_at,
        completed_at,
        created_at,
        updated_at,
        clients:client_id ( name ),
        bookings:booking_id ( reference )
      `)
      .eq("reference", ref)
      .maybeSingle();

    if (error || !data) return null;

    const p = data as any;
    return {
      id: p.id,
      reference: p.reference,
      title: p.title,
      description: p.description,
      status: p.status,
      client: p.clients?.name ?? "Unknown",
      clientId: p.client_id,
      bookingId: p.booking_id,
      bookingRef: p.bookings?.reference ?? null,
      startsAt: p.starts_at,
      completedAt: p.completed_at,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    };
  } catch (error) {
    console.error("getProjectByRef: table not available", (error as Error).message);
    return null;
  }
}
