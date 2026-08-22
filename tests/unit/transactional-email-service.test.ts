import { describe, expect, it } from "vitest";
import { ResendEmailError } from "@/lib/resend-email";
import { classifyEmailError } from "@/lib/server/transactional-email-service";

describe("transactional email error classification", () => {
  it("retries provider throttling without persisting provider details", () => {
    expect(classifyEmailError(new ResendEmailError("recipient data", 429, "rate_limit_exceeded"))).toEqual({
      code: "rate_limit_exceeded", message: "Resend request failed (429).", retryable: true,
    });
  });

  it("does not retry invalid provider requests", () => {
    expect(classifyEmailError(new ResendEmailError("invalid recipient", 422, "validation_error"))).toEqual({
      code: "validation_error", message: "Resend request failed (422).", retryable: false,
    });
  });

  it("classifies unknown failures safely", () => {
    expect(classifyEmailError(new Error("token=secret"))).toEqual({
      code: "provider_unavailable", message: "Email provider request failed.", retryable: true,
    });
  });
});
