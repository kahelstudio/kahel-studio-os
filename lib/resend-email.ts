export type TransactionalEmail = {
  to: string | string[];
  from: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey?: string;
};

export class ResendEmailError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
    this.name = "ResendEmailError";
  }
}

export async function sendResendEmail(apiKey: string, message: TransactionalEmail) {
  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(message.idempotencyKey ? { "Idempotency-Key": message.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: message.from,
        to: Array.isArray(message.to) ? message.to : [message.to],
        reply_to: message.replyTo,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });
  } catch (fetchError) {
    // Network-level failure (DNS, timeout, connection refused, SSRF block, etc.)
    console.error("[resend] fetch failed:", fetchError instanceof Error ? fetchError.message : String(fetchError));
    throw fetchError;
  }

  let result: { id?: string; message?: string; name?: string };
  try {
    result = await response.json() as typeof result;
  } catch {
    // Resend returned a non-JSON response (e.g. HTML error page)
    const body = await response.text().catch(() => "(unreadable)");
    console.error(`[resend] non-JSON response HTTP ${response.status}:`, body.slice(0, 500));
    throw new ResendEmailError(`Resend returned non-JSON (HTTP ${response.status})`, response.status);
  }

  if (!response.ok || !result.id) {
    console.error(`[resend] API error HTTP ${response.status}:`, result.message, result.name);
    throw new ResendEmailError(result.message ?? `Resend returned ${response.status}.`, response.status, result.name);
  }
  return result.id;
}
