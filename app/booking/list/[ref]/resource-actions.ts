"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { authenticationDisabled, getStaffPrincipal } from "@/lib/server/staff-auth";
import { reassignBookingResource, schedulingErrorMessage } from "@/lib/server/resource-scheduling";

/** Staff reassignment of one required resource. The database re-checks hours, leave/blocks and conflicts;
 *  an override can never create a double booking. */
export async function reassignResource(ref: string, bookingId: string, position: number, resourceId: string, reason: string) {
  const principal = await getStaffPrincipal(new Request("http://kahel.internal", { headers: new Headers(await headers()) }));
  if (!principal?.permissions.includes("bookings.manage")) throw new Error("Booking management permission is required.");
  if (!principal.userId && !authenticationDisabled()) throw new Error("Sign in with an active staff account.");
  if (!/^[0-9a-f-]{36}$/i.test(bookingId) || !/^[0-9a-f-]{36}$/i.test(resourceId) || !Number.isInteger(position) || position < 1 || position > 20 || !reason.trim()) {
    throw new Error("Choose a resource and enter a reason.");
  }
  try {
    await reassignBookingResource(bookingId, position, resourceId, principal.userId as string, reason.trim().slice(0, 500));
  } catch (error) {
    throw new Error(schedulingErrorMessage(error));
  }
  revalidatePath(`/booking/list/${ref}`);
  revalidatePath("/calendar");
}
