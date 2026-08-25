import "server-only";

import { getSupabaseAdmin } from "./supabase-admin";
import type { StaffPrincipal } from "./staff-auth";

export type PromoCodeType = "percentage" | "fixed_amount" | "free_addon";
export type PromoCodeStatus = "active" | "inactive" | "expired" | "exhausted";

export type PromoCodeRow = {
  id: string;
  code: string;
  label: string;
  description: string | null;
  type: PromoCodeType;
  value: number;
  currency: string;
  status: PromoCodeStatus;
  usageLimit: number | null;
  usageCount: number;
  maxUsesPerCustomer: number | null;
  validFrom: string;
  validUntil: string | null;
  applicableServices: string[];
  excludedServices: string[];
  minimumBookingAmount: number | null;
  maximumDiscountAmount: number | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type PromoCodesWorkspaceData = {
  canManage: boolean;
  rows: PromoCodeRow[];
  summary: {
    active: number;
    inactive: number;
    expired: number;
    exhausted: number;
    totalUses: number;
  };
};

function mapRow(row: {
  id: string;
  code: string;
  label: string;
  description: string | null;
  type: string;
  value: number;
  currency: string;
  status: string;
  usage_limit: number | null;
  usage_count: number;
  max_uses_per_customer: number | null;
  valid_from: string;
  valid_until: string | null;
  applicable_services: string[] | null;
  excluded_services: string[] | null;
  minimum_booking_amount: number | null;
  maximum_discount_amount: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}): PromoCodeRow {
  return {
    id: row.id,
    code: row.code,
    label: row.label,
    description: row.description,
    type: row.type as PromoCodeType,
    value: Number(row.value),
    currency: row.currency || "PHP",
    status: row.status as PromoCodeStatus,
    usageLimit: row.usage_limit,
    usageCount: row.usage_count,
    maxUsesPerCustomer: row.max_uses_per_customer,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    applicableServices: row.applicable_services ?? [],
    excludedServices: row.excluded_services ?? [],
    minimumBookingAmount: row.minimum_booking_amount,
    maximumDiscountAmount: row.maximum_discount_amount,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getPromoCodesWorkspace(principal: StaffPrincipal): Promise<PromoCodesWorkspaceData> {
  const canManage = principal.role === "admin" || principal.role === "super_admin";
  try {
    const result = await getSupabaseAdmin()
      .from("promo_codes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (result.error) throw result.error;
    const rows = (result.data ?? []).map(mapRow);
    return {
      canManage,
      rows,
      summary: {
        active: rows.filter((row) => row.status === "active").length,
        inactive: rows.filter((row) => row.status === "inactive").length,
        expired: rows.filter((row) => row.status === "expired").length,
        exhausted: rows.filter((row) => row.status === "exhausted").length,
        totalUses: rows.reduce((sum, row) => sum + row.usageCount, 0),
      },
    };
  } catch (error) {
    console.error("getPromoCodesWorkspace", (error as Error).message);
    return {
      canManage,
      rows: [],
      summary: { active: 0, inactive: 0, expired: 0, exhausted: 0, totalUses: 0 },
    };
  }
}
