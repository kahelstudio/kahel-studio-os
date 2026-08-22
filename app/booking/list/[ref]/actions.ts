"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import type { BookingStatusId } from "@/lib/sample-data";
import { bookingConflictMessage, isBookingSlotConflict } from "@/lib/server/booking-slots";
import { getStaffPrincipal } from "@/lib/server/staff-auth";

async function bookingManager() {
  const principal = await getStaffPrincipal(new Request("http://kahel.internal", { headers: new Headers(await headers()) }));
  if (!principal?.permissions.includes("bookings.manage")) throw new Error("Booking management permission is required.");
  return principal;
}

function revalidateBooking(ref: string) {
  revalidatePath(`/booking/list/${ref}`);
  revalidatePath("/booking/list");
  revalidatePath("/calendar");
}

export async function updateBookingStatus(ref: string, status: BookingStatusId) {
  const principal = await bookingManager();
  const admin = getSupabaseAdmin();
  const databaseStatus = status;
  if (!principal.userId) {
    const fallback = await admin.from("bookings").update({ status: databaseStatus }).eq("reference", ref);
    if (fallback.error) throw new Error(fallback.error.message);
  } else {
    const result = await admin.rpc("update_booking_status", {
      requested_reference: ref,
      requested_status: databaseStatus,
      requested_actor_id: principal.userId,
      requested_reason: `Status changed to ${databaseStatus} in Kahel Studio OS`,
    });
    if (isBookingSlotConflict(result.error)) throw new Error(bookingConflictMessage());
    if (result.error) throw new Error(result.error.message);
  }
  revalidateBooking(ref);
}

export async function rescheduleBooking(ref: string, serviceDate: string, serviceTime: string) {
  const principal = await bookingManager();
  const admin = getSupabaseAdmin();
  const selected = await admin.from("bookings").select("resource_id").eq("reference", ref).maybeSingle<{ resource_id: string }>();
  if (selected.error || !selected.data) throw new Error("Booking not found.");
  if (!principal.userId) {
    const fallback = await admin.from("bookings").update({ service_date: serviceDate, service_time: serviceTime }).eq("reference", ref);
    if (isBookingSlotConflict(fallback.error)) throw new Error(bookingConflictMessage());
    if (fallback.error) throw new Error(fallback.error.message);
  } else {
    const result = await admin.rpc("reschedule_booking", {
      requested_reference: ref,
      requested_date: serviceDate,
      requested_time: serviceTime,
      requested_resource_id: selected.data.resource_id,
      requested_actor_id: principal.userId,
      requested_reason: "Rescheduled from the Calendar",
    });
    if (isBookingSlotConflict(result.error)) throw new Error(bookingConflictMessage());
    if (result.error) throw new Error(result.error.message);
  }
  revalidateBooking(ref);
}

export async function saveDepositVerificationId(ref: string, verificationId: string) {
  await bookingManager();
  const result = await getSupabaseAdmin()
    .from("bookings")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ deposit_verification_id: verificationId.trim() || null } as any)
    .eq("reference", ref);
  if (result.error) throw new Error(result.error.message);
  revalidatePath(`/booking/list/${ref}`);
}

export async function cancelBooking(ref: string, reason: string) {
  const principal = await bookingManager();
  if (!principal.userId || !reason.trim()) throw new Error("A cancellation reason and staff identity are required.");
  const result = await getSupabaseAdmin().rpc("update_booking_status", {
    requested_reference: ref,
    requested_status: "cancelled",
    requested_actor_id: principal.userId,
    requested_reason: reason.trim(),
  });
  if (result.error) throw new Error(result.error.message);
  revalidateBooking(ref);
}
