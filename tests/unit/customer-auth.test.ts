import { afterEach, describe, expect, it } from "vitest";
import { isSafePortalPath, normalizeEmail, normalizeMobile } from "@/lib/server/customer-auth";
import { POST as signIn } from "@/app/api/customer/session/route";
import { POST as signUp } from "@/app/api/customer/sign-up/route";
import { POST as forgotPassword } from "@/app/api/customer/password-reset/route";
import { POST as checkout } from "@/app/api/paymongo/checkout/route";

const jsonRequest = (path: string, body: unknown, headers: Record<string, string> = {}) => new Request(`http://localhost:3000${path}`, { method: "POST", headers: { "Content-Type": "application/json", Origin: "http://localhost:3000", ...headers }, body: JSON.stringify(body) });

describe("customer authentication boundaries", () => {
  afterEach(() => {
    process.env.KAHEL_STAFF_EMAILS = "";
    delete process.env.PAYMONGO_SECRET_KEY;
  });

  it("normalizes customer identifiers", () => {
    expect(normalizeEmail("  Client@Example.COM ")).toBe("client@example.com");
    expect(normalizeMobile("0917 123 4567")).toBe("+639171234567");
  });

  it("allowlists only internal portal destinations", () => {
    expect(isSafePortalPath("/portal/projects?view=active")).toBe(true);
    expect(isSafePortalPath("//evil.example/portal")).toBe(false);
    expect(isSafePortalPath("https://evil.example/portal")).toBe(false);
    expect(isSafePortalPath("/os")).toBe(false);
  });

  it("returns the same generic sign-in error for invalid credentials", async () => {
    const response = await signIn(jsonRequest("/api/customer/session", { email: "not-an-email", password: "wrong" }));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Email or password is incorrect." });
  });

  it("does not admit staff identities to the customer sign-in flow", async () => {
    process.env.KAHEL_STAFF_EMAILS = "owner@example.com";
    const response = await signIn(jsonRequest("/api/customer/session", { email: "OWNER@example.com", password: "not-checked" }));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Email or password is incorrect." });
  });

  it("requires direct signup identity fields and never accepts a password", async () => {
    const response = await signUp(jsonRequest("/api/customer/sign-up", { firstName: "Ana", lastName: "Cruz", email: "ana@example.com", password: "ReadablePassword1!" }));
    expect(response.status).toBe(400);
  });

  it("keeps forgot-password responses neutral for malformed input", async () => {
    const response = await forgotPassword(jsonRequest("/api/customer/password-reset", { email: "not-an-email" }));
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ requested: true });
  });

  it("rejects a booking without a stable idempotency key before persistence", async () => {
    process.env.PAYMONGO_SECRET_KEY = "sk_test_example";
    const response = await checkout(jsonRequest("/api/paymongo/checkout", { name: "Ana Cruz", email: "ana@example.com", mobile: "09171234567", session: "Solo", date: "2026-12-01", time: "09:00", pay: "deposit" }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Refresh the page and submit the booking again." });
  });

  it("keeps studio sessions within opening hours based on their duration", async () => {
    process.env.PAYMONGO_SECRET_KEY = "sk_test_example";
    const response = await checkout(jsonRequest("/api/paymongo/checkout", { name: "Ana Cruz", email: "ana@example.com", mobile: "09171234567", session: "Solo", date: "2026-12-01", time: "16:30", pay: "deposit" }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Select a studio time between 8:00 AM and 5:00 PM." });
  });

  it("allows a mini session to end at closing time", async () => {
    process.env.PAYMONGO_SECRET_KEY = "sk_test_example";
    const response = await checkout(jsonRequest("/api/paymongo/checkout", { name: "Ana Cruz", email: "ana@example.com", mobile: "09171234567", session: "Mini Session", date: "2026-12-01", time: "16:30", pay: "deposit" }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Refresh the page and submit the booking again." });
  });

  it("allows event start times outside studio hours", async () => {
    process.env.PAYMONGO_SECRET_KEY = "sk_test_example";
    const response = await checkout(jsonRequest("/api/paymongo/checkout", { name: "Ana Cruz", email: "ana@example.com", mobile: "09171234567", session: "Birthday", date: "2026-12-01", time: "23:00", pay: "deposit" }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Refresh the page and submit the booking again." });
  });
});
