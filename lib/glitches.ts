export const GLITCH_STATUSES = ["Open", "In Progress", "Waiting", "Resolved", "Closed"] as const;
export const GLITCH_SEVERITIES = ["Low", "Medium", "High", "Critical"] as const;
export const GLITCH_CATEGORIES = ["System", "Booking", "Payment", "Equipment", "Files", "Internet", "Power", "Facility", "Client Concern", "Workflow", "Other"] as const;

export type GlitchStatus = (typeof GLITCH_STATUSES)[number];
export type GlitchSeverity = (typeof GLITCH_SEVERITIES)[number];
export type GlitchCategory = (typeof GLITCH_CATEGORIES)[number];

export const ACTIVE_GLITCH_STATUSES: GlitchStatus[] = ["Open", "In Progress", "Waiting"];
export const RESOLVED_GLITCH_STATUSES: GlitchStatus[] = ["Resolved", "Closed"];

export function isGlitchStatus(value: unknown): value is GlitchStatus {
  return typeof value === "string" && GLITCH_STATUSES.includes(value as GlitchStatus);
}

export function isGlitchSeverity(value: unknown): value is GlitchSeverity {
  return typeof value === "string" && GLITCH_SEVERITIES.includes(value as GlitchSeverity);
}

export function isGlitchCategory(value: unknown): value is GlitchCategory {
  return typeof value === "string" && GLITCH_CATEGORIES.includes(value as GlitchCategory);
}

export function cleanGlitchText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum).trim() : "";
}

export function validGlitchTimestamp(value: unknown) {
  if (typeof value !== "string" || !value) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp);
}
