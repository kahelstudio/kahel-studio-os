import type { GlitchSeverity, GlitchStatus } from "@/lib/glitches";

export const glitchStatusTone: Record<GlitchStatus, string> = { Open: "bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]", "In Progress": "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]", Waiting: "bg-[var(--color-info-bg)] text-[var(--color-info-text)]", Resolved: "bg-[var(--color-success-bg)] text-[var(--color-success-text)]", Closed: "bg-[var(--color-surface-muted)] text-[var(--color-text-primary)]" };
export const glitchSeverityTone: Record<GlitchSeverity, string> = { Low: "text-[var(--color-text-secondary)]", Medium: "text-[var(--color-warning-text)]", High: "text-[var(--color-danger-text)]", Critical: "text-[var(--color-danger-text)]" };
export function formatGlitchDate(value: string) { return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(value)); }
