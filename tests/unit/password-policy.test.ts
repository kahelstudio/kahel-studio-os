import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PASSWORD_BREACHED_MESSAGE, PASSWORD_REQUIREMENTS_MESSAGE, passwordMeetsPolicy } from "@/lib/password-policy";
import { passwordIsBreached, validatePassword } from "@/lib/server/password-policy";

const VALID = "Kahel!Studio2026";

// Hashed with node:crypto rather than the Web Crypto path the module uses, so
// the test does not simply restate the implementation.
function sha1Upper(value: string) {
  return createHash("sha1").update(value).digest("hex").toUpperCase();
}

function respondWith(body: string, ok = true) {
  const fetchMock = vi.fn<(url: unknown, init?: unknown) => Promise<Response>>(async () => ({ ok, text: async () => body }) as unknown as Response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("password composition rules", () => {
  it("accepts a password meeting every requirement", () => {
    expect(passwordMeetsPolicy(VALID)).toBe(true);
  });

  it.each([
    ["too short", "Kahel!2026"],
    ["no uppercase", "kahel!studio2026"],
    ["no lowercase", "KAHEL!STUDIO2026"],
    ["no digit", "Kahel!StudioKahel"],
    ["no symbol", "KahelStudio2026x"],
    ["too long", `${"A".repeat(120)}${"b1!".repeat(4)}`],
  ])("rejects a password with %s", (_label, password) => {
    expect(passwordMeetsPolicy(password)).toBe(false);
  });
});

describe("breach lookup", () => {
  it("sends only the first five hash characters", async () => {
    const fetchMock = respondWith("");
    await passwordIsBreached(VALID);

    const requested = String(fetchMock.mock.calls[0][0]);
    expect(requested).toBe(`https://api.pwnedpasswords.com/range/${sha1Upper(VALID).slice(0, 5)}`);
    expect(requested).not.toContain(sha1Upper(VALID).slice(5));
  });

  it("requests padded responses", async () => {
    const fetchMock = respondWith("");
    await passwordIsBreached(VALID);

    const init = fetchMock.mock.calls[0][1] as { headers?: Record<string, string> };
    expect(init.headers?.["Add-Padding"]).toBe("true");
  });

  it("reports a password present in the corpus", async () => {
    respondWith(`${sha1Upper(VALID).slice(5)}:42`);
    expect(await passwordIsBreached(VALID)).toBe(true);
  });

  it("ignores padding rows, which always carry a zero count", async () => {
    respondWith(`${sha1Upper(VALID).slice(5)}:0`);
    expect(await passwordIsBreached(VALID)).toBe(false);
  });

  it("reports a password absent from the corpus", async () => {
    respondWith(`${"0".repeat(35)}:9\n${"1".repeat(35)}:3`);
    expect(await passwordIsBreached(VALID)).toBe(false);
  });

  // The live endpoint separates rows with CRLF, so the parser has to tolerate
  // the trailing carriage return.
  it("parses the CRLF line endings the service actually returns", async () => {
    respondWith(`${"0".repeat(35)}:9\r\n${sha1Upper(VALID).slice(5)}:295389\r\n`);
    expect(await passwordIsBreached(VALID)).toBe(true);
  });

  it("fails open when the service errors", async () => {
    respondWith("", false);
    expect(await passwordIsBreached(VALID)).toBe(false);
  });

  it("fails open when the service is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));
    expect(await passwordIsBreached(VALID)).toBe(false);
  });
});

describe("validatePassword", () => {
  it("returns the requirements message for a weak password", async () => {
    respondWith("");
    expect(await validatePassword("short")).toBe(PASSWORD_REQUIREMENTS_MESSAGE);
  });

  it("returns the requirements message for a non-string input", async () => {
    respondWith("");
    expect(await validatePassword(undefined)).toBe(PASSWORD_REQUIREMENTS_MESSAGE);
  });

  it("does not call the breach service when the rules already fail", async () => {
    const fetchMock = respondWith("");
    await validatePassword("short");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns the breach message for a leaked password", async () => {
    respondWith(`${sha1Upper(VALID).slice(5)}:42`);
    expect(await validatePassword(VALID)).toBe(PASSWORD_BREACHED_MESSAGE);
  });

  it("returns null for a strong password absent from the corpus", async () => {
    respondWith("");
    expect(await validatePassword(VALID)).toBeNull();
  });
});
