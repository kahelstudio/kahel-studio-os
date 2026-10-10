import { describe, expect, it } from "vitest";
import { canAccessMessages, canReadMessage, canRetryMessage, filterMessages, isFailedMessage, messageSummary, parseMessageFilters, sanitizeEmailPreview, sanitizeSafeError, type TransactionalMessage } from "@/lib/messages";

function message(overrides: Partial<TransactionalMessage> = {}): TransactionalMessage {
  return {
    id: "msg-1", templateId: "tpl-1", templateVersionId: "version-1", templateVersion: 2, templateKey: "booking-confirmed", recipient: "client@example.com", recipientName: "Alex Rivera", clientName: "Rivera Family",
    subject: "Booking KS-2026-0149 confirmed", status: "delivered", environment: "production", provider: "resend", providerMessageId: "provider-149", trigger: "booking.confirmed", source: "system", sourceReference: "booking:KS-2026-0149", module: "bookings",
    createdAt: "2026-08-13T01:00:00.000Z", queuedAt: "2026-08-13T01:00:00.000Z", updatedAt: "2026-08-13T01:02:00.000Z", acceptedAt: "2026-08-13T01:01:00.000Z", sentAt: "2026-08-13T01:01:00.000Z", deliveredAt: "2026-08-13T01:02:00.000Z", failedAt: null, cancelledAt: null, nextAttemptAt: null,
    htmlBody: "<p>Hello</p>", textBody: "Hello", containsSecureContent: false, contentRedacted: false, lastErrorCode: null, lastError: null, retryEligible: false, attemptCount: 1, maxAttempts: 5, actor: null, parentMessageId: null, resendSequence: 0,
    clientId: "client-1", bookingId: "booking-1", bookingReference: "KS-2026-0149", invoiceId: null, invoiceReference: null, paymentId: null, paymentReference: null, projectId: null, projectReference: null, galleryId: null, galleryReference: null,
    attempts: [], events: [], resendHistory: [], audit: [], ...overrides,
  };
}

const filters = (overrides: Partial<ReturnType<typeof parseMessageFilters>> = {}) => ({ ...parseMessageFilters({}), ...overrides });

describe("message filters", () => {
  it("parses supported URL facets and the search alias", () => {
    expect(parseMessageFilters({ search: " Alex ", status: "PROVIDER_ACCEPTED", date: "7D", module: "BOOKINGS", environment: "Production", retry: "eligible", from: "2026-08-01", to: "invalid" })).toMatchObject({ query: "Alex", status: "provider_accepted", date: "7d", module: "bookings", environment: "production", retry: "eligible", from: "2026-08-01", to: "" });
  });

  it("accepts q as a search alias identical to search", () => {
    expect(parseMessageFilters({ q: "  KS-001  " }).query).toBe("KS-001");
    expect(parseMessageFilters({ search: "KS-001", q: "other" }).query).toBe("KS-001");
  });

  it("caps query length at 200 characters", () => {
    expect(parseMessageFilters({ search: "a".repeat(300) }).query.length).toBe(200);
  });

  it("returns empty defaults when no params are provided", () => {
    const result = parseMessageFilters({});
    expect(result).toMatchObject({ query: "", status: "all", date: "all", template: "", module: "", environment: "", trigger: "", source: "", provider: "", retry: "", from: "", to: "" });
  });

  it("rejects unknown status values and falls back to all", () => {
    expect(parseMessageFilters({ status: "unknown_status" }).status).toBe("all");
    expect(parseMessageFilters({ status: "delivered" }).status).toBe("delivered");
  });

  it("searches client names, recipients, subjects, references, and provider IDs", () => {
    const messages = [message(), message({ id: "msg-2", clientName: "Other Client", recipient: "other@example.com", providerMessageId: "provider-200", bookingReference: "KS-2026-0200" })];
    expect(filterMessages(messages, filters({ query: "rivera family" })).map((item) => item.id)).toEqual(["msg-1"]);
    expect(filterMessages(messages, filters({ query: "provider-200" })).map((item) => item.id)).toEqual(["msg-2"]);
  });

  it("returns all messages when no filters are active", () => {
    const messages = [message(), message({ id: "msg-2", status: "queued" })];
    expect(filterMessages(messages, filters())).toHaveLength(2);
  });

  it("returns an empty array for an empty message list", () => {
    expect(filterMessages([], filters({ query: "anything" }))).toHaveLength(0);
  });

  it("filters all canonical facets and Manila calendar dates", () => {
    const messages = [message({ status: "provider_accepted", createdAt: "2026-08-12T16:30:00.000Z" }), message({ id: "msg-2", module: "payments", createdAt: "2026-08-12T15:30:00.000Z" })];
    expect(filterMessages(messages, filters({ status: "provider_accepted", module: "bookings", environment: "production", provider: "resend", source: "system", trigger: "booking.confirmed", from: "2026-08-13", to: "2026-08-13" })).map((item) => item.id)).toEqual(["msg-1"]);
  });

  it("filters retry eligibility correctly", () => {
    const messages = [
      message({ id: "eligible", status: "failed", retryEligible: true, attemptCount: 1, maxAttempts: 5 }),
      message({ id: "ineligible", status: "failed", retryEligible: false }),
    ];
    expect(filterMessages(messages, filters({ retry: "eligible" })).map((item) => item.id)).toEqual(["eligible"]);
    expect(filterMessages(messages, filters({ retry: "ineligible" })).map((item) => item.id)).toEqual(["ineligible"]);
    expect(filterMessages(messages, filters({ retry: "" }))).toHaveLength(2);
  });
});

describe("failure and metrics semantics", () => {
  it("includes terminal failures and stale deferred records in Failed", () => {
    const now = new Date("2026-08-13T02:00:00.000Z");
    expect(isFailedMessage(message({ status: "suppressed" }), now)).toBe(true);
    expect(isFailedMessage(message({ status: "deferred", updatedAt: "2026-08-13T01:00:00.000Z" }), now)).toBe(true);
    expect(isFailedMessage(message({ status: "deferred", updatedAt: "2026-08-13T01:45:00.000Z" }), now)).toBe(false);
  });

  it("marks bounced and complained as terminal failures", () => {
    const now = new Date("2026-08-13T02:00:00.000Z");
    expect(isFailedMessage(message({ status: "bounced" }), now)).toBe(true);
    expect(isFailedMessage(message({ status: "complained" }), now)).toBe(true);
    expect(isFailedMessage(message({ status: "delivered" }), now)).toBe(false);
    expect(isFailedMessage(message({ status: "sent" }), now)).toBe(false);
  });

  it("only retries safe transient failed records", () => {
    expect(canRetryMessage(message({ status: "failed", retryEligible: true, attemptCount: 2 }))).toBe(true);
    expect(canRetryMessage(message({ status: "bounced", retryEligible: true }))).toBe(false);
    expect(canRetryMessage(message({ status: "failed", retryEligible: true, containsSecureContent: true }))).toBe(false);
  });

  it("blocks retry when content is redacted", () => {
    expect(canRetryMessage(message({ status: "failed", retryEligible: true, contentRedacted: true }))).toBe(false);
  });

  it("blocks retry when max attempts is reached", () => {
    expect(canRetryMessage(message({ status: "failed", retryEligible: true, attemptCount: 5, maxAttempts: 5 }))).toBe(false);
    expect(canRetryMessage(message({ status: "failed", retryEligible: true, attemptCount: 4, maxAttempts: 5 }))).toBe(true);
  });

  it("computes requested metrics from the supplied filtered records", () => {
    const summary = messageSummary([message(), message({ id: "2", status: "queued", sentAt: null }), message({ id: "3", status: "suppressed", sentAt: null })], new Date("2026-08-13T05:00:00.000Z"));
    expect(summary).toEqual({ sentToday: 1, delivered: 1, pending: 1, failed: 1 });
  });

  it("returns zero metrics for an empty message list", () => {
    expect(messageSummary([])).toEqual({ sentToday: 0, delivered: 0, pending: 0, failed: 0 });
  });

  it("counts all pending statuses correctly", () => {
    const pending = ["queued", "processing", "provider_accepted", "sent", "deferred"].map((status, i) => message({ id: String(i), status, sentAt: null }));
    expect(messageSummary(pending).pending).toBe(5);
  });
});

describe("message permissions", () => {
  it("allows admins globally and scopes staff to existing domain permissions", () => {
    expect(canReadMessage(message(), { role: "admin", permissions: [] })).toBe(true);
    expect(canReadMessage(message(), { role: "staff", permissions: ["bookings.manage"] })).toBe(true);
    expect(canReadMessage(message(), { role: "staff", permissions: ["galleries.read"] })).toBe(false);
    expect(canAccessMessages({ role: "staff", permissions: [] })).toBe(false);
  });

  it("grants super_admin the same read access as admin", () => {
    expect(canReadMessage(message(), { role: "super_admin", permissions: [] })).toBe(true);
  });

  it("grants gallery staff access to gallery and project messages", () => {
    expect(canReadMessage(message({ galleryId: "gal-1", bookingId: null }), { role: "staff", permissions: ["galleries.read"] })).toBe(true);
    expect(canReadMessage(message({ projectId: "proj-1", bookingId: null }), { role: "staff", permissions: ["galleries.read"] })).toBe(true);
  });

  it("grants loyalty staff access only to loyalty template messages", () => {
    expect(canReadMessage(message({ templateKey: "loyalty_reward_issued", bookingId: null }), { role: "staff", permissions: ["loyalty.read"] })).toBe(true);
    expect(canReadMessage(message({ templateKey: "booking-confirmed", bookingId: null }), { role: "staff", permissions: ["loyalty.read"] })).toBe(false);
  });

  it("allows canAccessMessages with bookings.manage, galleries.read, or loyalty.read", () => {
    expect(canAccessMessages({ role: "staff", permissions: ["bookings.manage"] })).toBe(true);
    expect(canAccessMessages({ role: "staff", permissions: ["galleries.read"] })).toBe(true);
    expect(canAccessMessages({ role: "staff", permissions: ["loyalty.read"] })).toBe(true);
    expect(canAccessMessages({ role: "staff", permissions: ["payroll.manage"] })).toBe(false);
  });

  it("always grants canAccessMessages to admin and super_admin regardless of permissions", () => {
    expect(canAccessMessages({ role: "admin", permissions: [] })).toBe(true);
    expect(canAccessMessages({ role: "super_admin", permissions: [] })).toBe(true);
  });
});

describe("safe display", () => {
  it("redacts token-like error content", () => {
    expect(sanitizeSafeError("Provider token abcdefghijklmnopqrstuvwxyz123456 failed\nretry")).toBe("Provider token [redacted] failed retry");
  });

  it("returns null for null or empty input", () => {
    expect(sanitizeSafeError(null)).toBeNull();
    expect(sanitizeSafeError("")).toBeNull();
  });

  it("collapses newlines and tabs to spaces", () => {
    expect(sanitizeSafeError("line1\nline2\ttab")).toBe("line1 line2 tab");
  });

  it("truncates to 500 characters after redaction", () => {
    // Use short repeated words to avoid the ≥32-char token redaction pattern.
    const long = "error ".repeat(100); // 600 chars, no token-like substrings
    expect(sanitizeSafeError(long)?.length).toBe(500);
  });

  it("removes executable markup, event handlers, remote resources, and masks links", () => {
    const safe = sanitizeEmailPreview('<script>alert(1)</script><img src="https://tracker.test/pixel" onerror="alert(2)"><a href="javascript:alert(3)">Open</a><form action="https://bad.test"><input></form>');
    expect(safe).not.toMatch(/<script|onerror|https:\/\/tracker|javascript:|<form|<input/i);
    expect(safe).toContain('data-masked-link="true"');
    expect(safe).toContain("default-src 'none'");
  });

  it("allows safe inline images (data URIs) through the preview sanitizer", () => {
    const safe = sanitizeEmailPreview('<img src="data:image/png;base64,abc123">');
    expect(safe).toContain("data:image/png;base64,abc123");
  });

  it("blocks iframe and embed tags", () => {
    const safe = sanitizeEmailPreview('<iframe src="https://evil.test"></iframe><embed src="evil.swf">');
    expect(safe).not.toMatch(/<iframe|<embed/i);
  });

  it("forces color-scheme light for email previews", () => {
    const safe = sanitizeEmailPreview("<p>Hello</p>");
    expect(safe).toContain("color-scheme:light");
  });

  it("does not modify plain text content", () => {
    const safe = sanitizeEmailPreview("<p>Normal paragraph with <strong>bold</strong> text.</p>");
    expect(safe).toContain("Normal paragraph");
    expect(safe).toContain("<strong>");
  });
});
