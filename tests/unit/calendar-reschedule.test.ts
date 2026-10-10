import { describe, expect, it } from "vitest";
import { isElapsedCalendarSlot } from "@/app/calendar/calendar-grid";

describe("calendar reschedule time guard", () => {
  const noonManila = new Date("2026-09-27T04:00:00.000Z");

  it.each([
    ["2026-09-26", "18:00", true],
    ["2026-09-27", "11:30", true],
    ["2026-09-27", "12:00", true],
    ["2026-09-27", "12:30", false],
    ["2026-09-28", "07:00", false],
  ])("classifies %s %s as elapsed=%s", (date, time, elapsed) => {
    expect(isElapsedCalendarSlot(date, time, noonManila)).toBe(elapsed);
  });

  it("rejects malformed dates and times", () => {
    expect(isElapsedCalendarSlot("today", "soon", noonManila)).toBe(true);
  });
});
