import { describe, expect, it } from "vitest";
import { ACTIVE_GLITCH_STATUSES, GLITCH_CATEGORIES, GLITCH_SEVERITIES, GLITCH_STATUSES, RESOLVED_GLITCH_STATUSES, cleanGlitchText, isGlitchCategory, isGlitchSeverity, isGlitchStatus, validGlitchTimestamp } from "@/lib/glitches";

describe("glitch domain definitions", () => {
  it("keeps lifecycle groups complete and mutually exclusive", () => {
    expect([...ACTIVE_GLITCH_STATUSES, ...RESOLVED_GLITCH_STATUSES]).toEqual(GLITCH_STATUSES);
    expect(new Set([...ACTIVE_GLITCH_STATUSES, ...RESOLVED_GLITCH_STATUSES]).size).toBe(GLITCH_STATUSES.length);
  });

  it("uses the required severities and categories", () => {
    expect(GLITCH_SEVERITIES).toEqual(["Low", "Medium", "High", "Critical"]);
    expect(GLITCH_CATEGORIES).toContain("Client Concern");
    expect(GLITCH_CATEGORIES).toContain("Other");
  });

  it("validates only canonical values", () => {
    expect(isGlitchStatus("In Progress")).toBe(true);
    expect(isGlitchStatus("progress")).toBe(false);
    expect(isGlitchSeverity("Critical")).toBe(true);
    expect(isGlitchSeverity("Urgent")).toBe(false);
    expect(isGlitchCategory("Booking")).toBe(true);
    expect(isGlitchCategory("bookings")).toBe(false);
  });

  it("bounds text and validates timestamps", () => {
    expect(cleanGlitchText("  interrupted upload  ", 12)).toBe("interrupted");
    expect(validGlitchTimestamp("2026-08-09T10:30:00+08:00")).toBe(true);
    expect(validGlitchTimestamp("not-a-date")).toBe(false);
  });
});
