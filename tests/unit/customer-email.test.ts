import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ send: vi.fn().mockResolvedValue(true) }));
vi.mock("@/lib/server/transactional-email-service", () => ({ sendTransactionalEmail: mocks.send }));

import { sendBookingConfirmation } from "@/lib/server/customer-email";

describe("booking transactional email", () => {
  beforeEach(() => {
    vi.stubEnv("BOOKING_EMAIL_FROM", "Kahel Studio <hello@kahelstudio.com>");
    vi.stubEnv("BOOKING_EMAIL_REPLY_TO", "support@kahelstudio.com");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("uses the approved booking-request template contract", async () => {
    await expect(sendBookingConfirmation({
      to: "client@example.com",
      firstName: "Ana",
      reference: "KS-1001",
      service: "Portrait",
      date: "October 2, 2026",
      time: "10:00 AM",
      portalUrl: "https://example.com/portal",
      bookingId: "booking-1",
      clientId: "client-1",
      profileId: "profile-1",
    })).resolves.toBe(true);

    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({
      templateKey: "booking-request-received",
      triggerKey: "booking.created",
      bookingId: "booking-1",
      message: expect.objectContaining({ to: "client@example.com" }),
    }));
  });
});
