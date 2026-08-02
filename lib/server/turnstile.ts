import "server-only";

type SiteverifyResponse = {
  success: boolean;
  action?: string;
};

export function turnstileConfigured() {
  return Boolean(process.env.TURNSTILE_SECRET);
}

export function turnstileRequired() {
  return Boolean(process.env.TURNSTILE_SECRET);
}

export async function verifyTurnstile(request: Request, token: string) {
  if (!turnstileRequired()) return true;
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret || !token || token.length > 2048) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    const clientIp = request.headers.get("cf-connecting-ip");
    if (clientIp) body.set("remoteip", clientIp);
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return false;
    const result = await response.json() as SiteverifyResponse;
    return result.success === true && result.action === "turnstile-spin-v2";
  } catch {
    return false;
  }
}
