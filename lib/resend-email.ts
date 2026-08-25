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
  const response = await fetch("https://api.resend.com/emails", {
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
  const result = await response.json() as { id?: string; message?: string; name?: string };
  if (!response.ok || !result.id) throw new ResendEmailError(result.message ?? `Resend returned ${response.status}.`, response.status, result.name);
  return result.id;
}
