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

  it("searches client names, recipients, subjects, references, and provider IDs", () => {
    const messages = [message(), message({ id: "msg-2", clientName: "Other Client", recipient: "other@example.com", providerMessageId: "provider-200", bookingReference: "KS-2026-0200" })];
    expect(filterMessages(messages, filters({ query: "rivera family" })).map((item) => item.id)).toEqual(["msg-1"]);
    expect(filterMessages(messages, filters({ query: "provider-200" })).map((item) => item.id)).toEqual(["msg-2"]);
  });

  it("filters all canonical facets and Manila calendar dates", () => {
    const messages = [message({ status: "provider_accepted", createdAt: "2026-08-12T16:30:00.000Z" }), message({ id: "msg-2", module: "payments", createdAt: "2026-08-12T15:30:00.000Z" })];
    expect(filterMessages(messages, filters({ status: "provider_accepted", module: "bookings", environment: "production", provider: "resend", source: "system", trigger: "booking.confirmed", from: "2026-08-13", to: "2026-08-13" })).map((item) => item.id)).toEqual(["msg-1"]);
  });
});

describe("failure and metrics semantics", () => {
  it("includes terminal failures and stale deferred records in Failed", () => {
    const now = new Date("2026-08-13T02:00:00.000Z");
    expect(isFailedMessage(message({ status: "suppressed" }), now)).toBe(true);
    expect(isFailedMessage(message({ status: "deferred", updatedAt: "2026-08-13T01:00:00.000Z" }), now)).toBe(true);
    expect(isFailedMessage(message({ status: "deferred", updatedAt: "2026-08-13T01:45:00.000Z" }), now)).toBe(false);
  });

  it("only retries safe transient failed records", () => {
    expect(canRetryMessage(message({ status: "failed", retryEligible: true, attemptCount: 2 }))).toBe(true);
    expect(canRetryMessage(message({ status: "bounced", retryEligible: true }))).toBe(false);
    expect(canRetryMessage(message({ status: "failed", retryEligible: true, containsSecureContent: true }))).toBe(false);
  });

  it("computes requested metrics from the supplied filtered records", () => {
    const summary = messageSummary([message(), message({ id: "2", status: "queued", sentAt: null }), message({ id: "3", status: "suppressed", sentAt: null })], new Date("2026-08-13T05:00:00.000Z"));
    expect(summary).toEqual({ sentToday: 1, delivered: 1, pending: 1, failed: 1 });
  });
});

describe("message permissions", () => {
  it("allows admins globally and scopes staff to existing domain permissions", () => {
    expect(canReadMessage(message(), { role: "admin", permissions: [] })).toBe(true);
    expect(canReadMessage(message(), { role: "staff", permissions: ["bookings.manage"] })).toBe(true);
    expect(canReadMessage(message(), { role: "staff", permissions: ["galleries.read"] })).toBe(false);
    expect(canAccessMessages({ role: "staff", permissions: [] })).toBe(false);
  });
});

describe("safe display", () => {
  it("redacts token-like error content", () => {
    expect(sanitizeSafeError("Provider token abcdefghijklmnopqrstuvwxyz123456 failed\nretry")).toBe("Provider token [redacted] failed retry");
  });

  it("removes executable markup, event handlers, remote resources, and masks links", () => {
    const safe = sanitizeEmailPreview('<script>alert(1)</script><img src="https://tracker.test/pixel" onerror="alert(2)"><a href="javascript:alert(3)">Open</a><form action="https://bad.test"><input></form>');
    expect(safe).not.toMatch(/<script|onerror|https:\/\/tracker|javascript:|<form|<input/i);
    expect(safe).toContain('data-masked-link="true"');
    expect(safe).toContain("default-src 'none'");
  });
});
