// Loads .env.local and makes the environment safe for concurrency tests:
// - refuses to run unless Supabase is local and PayMongo keys are test keys
// - removes every real e-mail/SMS credential (no transactional message can leave the machine)
// - blocks all outbound network except the local Supabase; PayMongo is answered by an in-process mock
import { readFileSync } from "node:fs";
import { vi } from "vitest";
import { installNetworkGuard } from "./harness";

for (const line of readFileSync(new URL("../../.env.local", import.meta.url), "utf8").split("\n")) {
  const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^"|"$/g, "");
}

const supabaseUrl = process.env.SUPABASE_URL ?? "";
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(supabaseUrl)) throw new Error("booking-safety tests refuse to run: SUPABASE_URL is not local");
if (!(process.env.PAYMONGO_SECRET_KEY ?? "").startsWith("sk_test_")) throw new Error("booking-safety tests refuse to run: PAYMONGO_SECRET_KEY is not a test key");
if (!process.env.PAYMONGO_WEBHOOK_SECRET) process.env.PAYMONGO_WEBHOOK_SECRET = "whsk_safety_test_local_only";

for (const key of Object.keys(process.env)) {
  if (/RESEND|SMTP|SENDGRID|POSTMARK|TWILIO|SEMAPHORE|SMS|MAILGUN/.test(key)) delete process.env[key];
}
(process.env as Record<string, string>).APP_ENV = "development";
process.env.PUBLIC_SITE_URL = "http://localhost";

installNetworkGuard(supabaseUrl);

// Outbound messages are replaced by counters (the counters are asserted by the tests).
vi.mock("@/lib/server/customer-email", async () => ({
  sendBookingConfirmation: vi.fn(async () => true),
  sendBookingTermsReviewRequest: vi.fn(async () => true),
}));
vi.mock("@/lib/server/payment-receipt-email", async () => ({ sendPaymentReceipt: vi.fn(async () => true) }));
vi.mock("@/lib/server/customer-auth", async (original) => ({
  ...(await original<typeof import("@/lib/server/customer-auth")>()),
  ensureCustomerAccount: vi.fn(async () => ({ activationUrl: undefined })),
}));
// `after()` needs a Next request scope; run the callback inline so its effects are observable.
vi.mock("next/server", async (original) => {
  const actual = await original<typeof import("next/server")>();
  return { ...actual, after: (callback: () => unknown) => { void Promise.resolve().then(callback); } };
});
