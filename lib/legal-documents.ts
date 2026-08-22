export type LegalDocumentSection = { number: number; title: string; text: string };

export type BookingTermsContent = {
  version_label: string;
  effective_date: string | null;
  title: string;
  summary: string[];
  disclaimer?: string;
  sections: LegalDocumentSection[];
};

export type PublishedBookingTerms = {
  id: string;
  versionNumber: number;
  versionLabel: string;
  title: string;
  summary: string[];
  effectiveDate: string;
  publishedAt: string;
  updatedAt: string;
  contentHash: string;
  sections: LegalDocumentSection[];
};

export function parseBookingTermsContent(value: unknown): BookingTermsContent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const content = value as Record<string, unknown>;
  if (typeof content.version_label !== "string" || typeof content.title !== "string" || !Array.isArray(content.summary) || !Array.isArray(content.sections)) return null;
  const summary = content.summary.filter((item): item is string => typeof item === "string");
  const sections = content.sections.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const section = item as Record<string, unknown>;
    return typeof section.number === "number" && typeof section.title === "string" && typeof section.text === "string"
      ? [{ number: section.number, title: section.title, text: section.text }]
      : [];
  });
  return {
    version_label: content.version_label,
    effective_date: typeof content.effective_date === "string" ? content.effective_date : null,
    title: content.title,
    summary,
    disclaimer: typeof content.disclaimer === "string" ? content.disclaimer : undefined,
    sections,
  };
}

export const BOOKING_TERMS_SUMMARY = [
  "A booking is secured only when the configured confirmation conditions are met.",
  "Deposit, balance, rescheduling, cancellation, lateness, and no-show rules apply.",
  "Deliverables and turnaround depend on the selected service.",
  "Add-ons and approved upgrades may cost extra.",
  "Privacy and image-publication choices are handled separately.",
] as const;
