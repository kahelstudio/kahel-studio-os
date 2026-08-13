import { describe, expect, it } from "vitest";
import { canAccessMessages, canReadMessage, filterMessages, parseMessageFilters, sanitizeEmailPreview, type TransactionalMessage } from "@/lib/messages";

function message(overrides: Partial<TransactionalMessage> = {}): TransactionalMessage {
  return {
    id: "msg-1", templateId: "tpl-1", templateKey: "booking-confirmed", recipient: "client@example.com", recipientName: "Alex Rivera",
    subject: "Booking KS-2026-0149 confirmed", status: "delivered", createdAt: "2026-08-13T01:00:00.000Z", sentAt: "2026-08-13T01:01:00.000Z", deliveredAt: "2026-08-13T01:02:00.000Z", failedAt: null,
    htmlBody: "<p>Hello</p>", textBody: "Hello", clientId: "client-1", bookingId: "booking-1", bookingReference: "KS-2026-0149", projectId: null, projectReference: null, paymentId: null, galleryId: null, attempts: [], events: [], ...overrides,
  };
}

describe("message filters", () => {
  it("parses only supported URL values", () => {
    expect(parseMessageFilters({ q: " Alex ", status: "FAILED", from: "2026-08-01", to: "invalid" })).toEqual({ query: "Alex", status: "failed", template: "", from: "2026-08-01", to: "" });
  });

  it("searches canonical IDs, recipients, subjects, and references", () => {
    const messages = [message(), message({ id: "msg-2", recipient: "other@example.com", recipientName: "Other Client", subject: "A different booking", bookingReference: "KS-2026-0200" })];
    expect(filterMessages(messages, { query: "0149", status: "all", template: "", from: "", to: "" }).map((item) => item.id)).toEqual(["msg-1"]);
    expect(filterMessages(messages, { query: "OTHER@", status: "all", template: "", from: "", to: "" }).map((item) => item.id)).toEqual(["msg-2"]);
  });

  it("filters failed records and Manila calendar dates", () => {
    const messages = [message({ status: "failed", createdAt: "2026-08-12T16:30:00.000Z" }), message({ id: "msg-2", status: "delivered", createdAt: "2026-08-12T15:30:00.000Z" })];
    expect(filterMessages(messages, { query: "", status: "failed", template: "", from: "2026-08-13", to: "2026-08-13" }).map((item) => item.id)).toEqual(["msg-1"]);
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

describe("email preview sanitation", () => {
  it("removes executable markup, event handlers, remote resources, and masks links", () => {
    const safe = sanitizeEmailPreview('<script>alert(1)</script><img src="https://tracker.test/pixel" onerror="alert(2)"><a href="javascript:alert(3)">Open</a><form action="https://bad.test"><input></form>');
    expect(safe).not.toMatch(/<script|onerror|https:\/\/tracker|javascript:|<form|<input/i);
    expect(safe).toContain('data-masked-link="true"');
    expect(safe).toContain("default-src 'none'");
  });

  it("keeps embedded image data while blocking CSS remote URLs", () => {
    const safe = sanitizeEmailPreview('<img src="data:image/png;base64,AAAA"><div style="background:url(https://bad.test/a.png)">Hi</div>');
    expect(safe).toContain("data:image/png;base64,AAAA");
    expect(safe).not.toContain("https://bad.test");
  });
});
