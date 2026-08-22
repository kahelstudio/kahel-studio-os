type DatabaseError = { code?: string; message?: string };

export function isBookingSlotConflict(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const databaseError = error as DatabaseError;
  return databaseError.code === "23P01" || (
    databaseError.code === "23505" &&
    databaseError.message?.includes("booking_reservations") === true
  );
}

export function bookingConflictMessage() {
  return "This time was just booked by someone else. Please choose another available time.";
}
