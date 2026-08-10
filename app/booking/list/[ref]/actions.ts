"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import type { BookingStatusId } from "@/lib/sample-data";

export async function updateBookingStatus(ref: string, status: BookingStatusId) {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("bookings")
    .update({ status })
    .eq("reference", ref);
  if (error) throw new Error(error.message);
  revalidatePath(`/booking/list/${ref}`);
  revalidatePath("/booking/list");
}
