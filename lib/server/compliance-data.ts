import { getSupabaseAdmin } from "./supabase-admin";

export type ComplianceRecord = {
  id: string;
  requirement: string;
  category: string;
  agency: string;
  referenceNumber: string | null;
  frequency: string;
  responsiblePerson: string;
  estimatedCost: string | null;
  actualCost: string | null;
  status: string;
  expiresOn: string | null;
};

export type ComplianceSummary = {
  total: number;
  expired: number;
  action: number;
  dueSoon: number;
  submitted: number;
  review: number;
  compliant: number;
};

const STATUS_ORDER: Record<string, number> = {
  expired: 0,
  action: 1,
  duesoon: 2,
  submitted: 3,
  review: 4,
  compliant: 5,
  na: 6,
};

export async function getComplianceRegister(): Promise<ComplianceRecord[]> {
  try {
    const admin = getSupabaseAdmin();

    const { data, error } = await admin
      .from("compliance_records")
      .select("id, requirement, category, agency, reference_number, frequency, responsible_person, estimated_cost, actual_cost, status, expires_on")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const records = (data ?? []).map((r: any) => ({
      id: r.id,
      requirement: r.requirement,
      category: r.category,
      agency: r.agency,
      referenceNumber: r.reference_number,
      frequency: r.frequency,
      responsiblePerson: r.responsible_person,
      estimatedCost: r.estimated_cost,
      actualCost: r.actual_cost,
      status: r.status,
      expiresOn: r.expires_on,
    }));

    return records.sort((a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99));
  } catch (error) {
    console.error("getComplianceRegister: table not available", (error as Error).message);
    return [];
  }
}

export async function getComplianceSummary(): Promise<ComplianceSummary> {
  try {
    const admin = getSupabaseAdmin();

    const { data, error } = await admin
      .from("compliance_records")
      .select("status");

    if (error) throw error;

    const counts: Record<string, number> = {};
    for (const r of data ?? []) {
      counts[r.status] = (counts[r.status] ?? 0) + 1;
    }

    return {
      total: (data ?? []).length,
      expired: counts["expired"] ?? 0,
      action: counts["action"] ?? 0,
      dueSoon: counts["duesoon"] ?? 0,
      submitted: counts["submitted"] ?? 0,
      review: counts["review"] ?? 0,
      compliant: counts["compliant"] ?? 0,
    };
  } catch (error) {
    console.error("getComplianceSummary: table not available", (error as Error).message);
    return { total: 0, expired: 0, action: 0, dueSoon: 0, submitted: 0, review: 0, compliant: 0 };
  }
}
