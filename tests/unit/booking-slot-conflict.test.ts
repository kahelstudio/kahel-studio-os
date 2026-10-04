import { describe, expect, it } from "vitest";
import { isBookingSlotConflict } from "@/lib/server/booking-slots";

describe("isBookingSlotConflict", () => {
  it("treats exclusion violations as slot conflicts", () => {
    expect(isBookingSlotConflict({ code: "23P01", message: "booking schedule conflicts with an existing reservation" })).toBe(true);
  });
  it("treats a second booking claiming an already linked hold as a conflict (Phase 4A: was a 503)", () => {
    expect(isBookingSlotConflict({ code: "23505", message: "reservation hold is already linked to another booking" })).toBe(true);
  });
  it("does not treat unrelated unique violations as slot conflicts", () => {
    expect(isBookingSlotConflict({ code: "23505", message: "duplicate key value violates unique constraint \"bookings_reference_key\"" })).toBe(false);
  });
});
