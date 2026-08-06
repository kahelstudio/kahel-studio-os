/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseAdmin } from "./supabase-admin";

export type EquipmentRow = {
  id: string;
  serial: string;
  name: string;
  category: string;
  status: string;
  note: string | null;
  location: string | null;
  checkedOutTo: string | null;
  checkedOutSince: string | null;
  expectedReturn: string | null;
};

export type CheckoutRow = {
  id: string;
  equipmentId: string;
  equipmentSerial: string;
  equipmentName: string;
  purpose: string;
  checkedOutAt: string;
  expectedReturnAt: string | null;
  returnedAt: string | null;
  conditionOnReturn: string | null;
};

export async function getEquipment(): Promise<EquipmentRow[]> {
  try {
    const admin = getSupabaseAdmin();

    const { data: equipment, error } = await admin
      .from("equipment")
      .select("id, serial, name, category, status, note, location")
      .order("name", { ascending: true });

    if (error) throw error;

    const equipmentIds = (equipment ?? []).map((e: any) => e.id);

    const { data: activeCheckouts, error: cError } = await admin
      .from("equipment_checkouts")
      .select("equipment_id, checked_out_at, expected_return_at")
      .in("equipment_id", equipmentIds)
      .is("returned_at", null);

    if (cError) throw cError;

    const checkoutMap = new Map<string, { checkedOutAt: string; expectedReturn: string | null }>();
    for (const c of activeCheckouts ?? []) {
      checkoutMap.set(c.equipment_id, {
        checkedOutAt: c.checked_out_at,
        expectedReturn: c.expected_return_at,
      });
    }

    return (equipment ?? []).map((e: any) => {
      const co = checkoutMap.get(e.id);
      return {
        id: e.id,
        serial: e.serial,
        name: e.name,
        category: e.category,
        status: e.status,
        note: e.note,
        location: e.location,
        checkedOutTo: co ? "Active" : null,
        checkedOutSince: co?.checkedOutAt ?? null,
        expectedReturn: co?.expectedReturn ?? null,
      };
    });
  } catch (error) {
    console.error("getEquipment: table not available", (error as Error).message);
    return [];
  }
}

export async function getCheckouts(): Promise<CheckoutRow[]> {
  try {
    const admin = getSupabaseAdmin();

    const { data, error } = await admin
      .from("equipment_checkouts")
      .select(`
        id,
        equipment_id,
        purpose,
        checked_out_at,
        expected_return_at,
        returned_at,
        condition_on_return,
        equipment:equipment_id ( serial, name )
      `)
      .is("returned_at", null)
      .order("checked_out_at", { ascending: false });

    if (error) throw error;

    return (data ?? []).map((c: any) => ({
      id: c.id,
      equipmentId: c.equipment_id,
      equipmentSerial: c.equipment?.serial ?? "",
      equipmentName: c.equipment?.name ?? "",
      purpose: c.purpose,
      checkedOutAt: c.checked_out_at,
      expectedReturnAt: c.expected_return_at,
      returnedAt: c.returned_at,
      conditionOnReturn: c.condition_on_return,
    }));
  } catch (error) {
    console.error("getCheckouts: table not available", (error as Error).message);
    return [];
  }
}
