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

export async function rescheduleBooking(ref: string, serviceDate: string, serviceTime: string) {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("bookings")
    .update({ service_date: serviceDate, service_time: serviceTime })
    .eq("reference", ref);
  if (error) throw new Error(error.message);
  revalidatePath(`/booking/list/${ref}`);
  revalidatePath("/booking/list");
  revalidatePath("/calendar");
}

export async function saveDepositVerificationId(ref: string, verificationId: string) {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("bookings")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ deposit_verification_id: verificationId.trim() || null } as any)
    .eq("reference", ref);
  if (error) throw new Error(error.message);
  revalidatePath(`/booking/list/${ref}`);
}
