import { describe, expect, it } from "vitest";
import { ResendEmailError } from "@/lib/resend-email";
import { classifyEmailError, mapResendEventStatus, renderTransactionalTemplate, validateRenderedTransactionalEmail } from "@/lib/server/transactional-email-service";

const validMessage = {
  to: "client@example.com",
  from: "Kahel Studio <hello@kahelstudio.com>",
  replyTo: "support@kahelstudio.com",
  subject: "Booking received",
  html: "<p>Your booking was received.</p>",
  text: "Your booking was received.",
};

describe("transactional email error classification", () => {
  it("retries provider throttling without persisting provider details", () => {
    expect(classifyEmailError(new ResendEmailError("recipient data", 429, "rate_limit_exceeded"))).toEqual({
      code: "rate_limit_exceeded", message: "Email provider rate limit reached.", retryable: true,
    });
  });

  it("does not retry invalid provider requests", () => {
    expect(classifyEmailError(new ResendEmailError("invalid recipient", 422, "validation_error"))).toEqual({
      code: "validation_error", message: "Email provider rejected the message data.", retryable: false,
    });
  });

  it("classifies unknown failures safely", () => {
    expect(classifyEmailError(new Error("token=secret"))).toEqual({
      code: "provider_unavailable", message: "Email provider request failed.", retryable: true,
    });
  });

  it("classifies provider authentication failures without exposing details", () => {
    expect(classifyEmailError(new ResendEmailError("secret key was rejected", 401, "invalid_api_key"))).toEqual({
      code: "provider_authentication_failed", message: "Email provider authentication failed.", retryable: false,
    });
  });
});

describe("transactional email validation", () => {
  it("accepts an approved catalogue template rendered by the application", () => {
    expect(validateRenderedTransactionalEmail("booking-request-received", validMessage).name).toBe("Booking request received");
  });

  it("rejects missing or malformed recipients before enqueueing", () => {
    expect(() => validateRenderedTransactionalEmail("booking-request-received", { ...validMessage, to: "" })).toThrow("recipient email is missing or invalid");
    expect(() => validateRenderedTransactionalEmail("booking-request-received", { ...validMessage, to: "not-an-email" })).toThrow("recipient email is missing or invalid");
  });

  it("rejects unavailable templates with a safe error", () => {
    expect(() => validateRenderedTransactionalEmail("booking-confirmation", validMessage)).toThrow("No active email template version is available.");
  });

  it("rejects unresolved approved and unsupported merge fields", () => {
    expect(() => validateRenderedTransactionalEmail("booking-request-received", { ...validMessage, subject: "Booking {{ booking_id }}" })).toThrow("Missing required merge field: booking_id.");
    expect(() => validateRenderedTransactionalEmail("booking-request-received", { ...validMessage, html: "<p>{{ secret_token }}</p>" })).toThrow("Unsupported merge field: secret_token.");
  });

  it("regenerates a DB template with escaped HTML fields", () => {
    expect(renderTransactionalTemplate("booking-request-received", {
      subject: "Booking {{ booking_id }}",
      html: "<p>Hello {{ customer_name }}</p>",
      text: "Hello {{ customer_name }}",
    }, { booking_id: "KS-1", customer_name: "<Alex & Co>" })).toEqual({
      subject: "Booking KS-1",
      html: "<p>Hello &lt;Alex &amp; Co&gt;</p>",
      text: "Hello <Alex & Co>",
    });
  });

  it("rejects a DB template when a referenced field is missing", () => {
    expect(() => renderTransactionalTemplate("booking-request-received", {
      subject: "Booking {{ booking_id }}", html: "<p>Ready</p>", text: "Ready",
    }, {})).toThrow("Missing required merge field: booking_id.");
  });
});

describe("Resend webhook status mapping", () => {
  it("maps delivery and failure lifecycle events", () => {
    expect(mapResendEventStatus("email.sent")).toBe("sent");
    expect(mapResendEventStatus("email.delivered")).toBe("delivered");
    expect(mapResendEventStatus("email.bounced")).toBe("bounced");
    expect(mapResendEventStatus("email.failed")).toBe("failed");
    expect(mapResendEventStatus("unknown.event")).toBeNull();
  });
});
