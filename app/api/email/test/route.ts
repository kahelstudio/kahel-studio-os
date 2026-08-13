import { hasTrustedOrigin } from "@/lib/server/customer-auth";
import { getStaffPrincipal } from "@/lib/server/staff-auth";
import { sendTransactionalEmail } from "@/lib/server/transactional-email-service";

export const runtime = "nodejs";

const ALLOWED_RECIPIENTS = new Set(["hello@kahel.studio", "joanne.kahelstudio@gmail.com"]);

async function secretMatches(provided: string | null, expected: string | undefined) {
  if (!provided || !expected) return false;
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([crypto.subtle.digest("SHA-256", encoder.encode(provided)), crypto.subtle.digest("SHA-256", encoder.encode(expected))]);
  const a = new Uint8Array(left), b = new Uint8Array(right);
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

export async function POST(request: Request) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  const oneTimeOperator = await secretMatches(bearer, process.env.EMAIL_TEST_SECRET);
  const principal = oneTimeOperator ? null : await getStaffPrincipal(request);
  if (!oneTimeOperator && (!principal || principal.role !== "super_admin" || !hasTrustedOrigin(request))) return Response.json({ error: "Unauthorized." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request body." }, { status: 400 }); }
  const recipients = body && typeof body === "object" && !Array.isArray(body) && Array.isArray((body as { recipients?: unknown }).recipients) ? (body as { recipients: unknown[] }).recipients : [];
  const normalized = [...new Set(recipients.map((value) => typeof value === "string" ? value.trim().toLowerCase() : ""))];
  if (!normalized.length || normalized.length > 2 || normalized.some((recipient) => !ALLOWED_RECIPIENTS.has(recipient))) return Response.json({ error: "Choose only the approved test recipients." }, { status: 400 });
  const from = process.env.BOOKING_EMAIL_FROM;
  if (!from) return Response.json({ error: "Sender address is not configured." }, { status: 503 });
  const operationId = crypto.randomUUID();
  const results = [];
  for (const recipient of normalized) {
    const accepted = await sendTransactionalEmail({
      templateKey: "delivery-test",
      logicalIdempotencyKey: `delivery-test:${operationId}:${recipient}`,
      triggerKey: "operator.delivery_test",
      source: "staff",
      sourceReference: `Delivery test ${operationId}`,
      recipientName: recipient === "hello@kahel.studio" ? "Kahel Studio" : "Joanne",
      recipientSnapshot: { email: recipient, purpose: "transactional delivery test" },
      renderContext: { operationId },
      message: {
        to: recipient,
        from,
        replyTo: process.env.BOOKING_EMAIL_REPLY_TO,
        subject: "Kahel Studio transactional email test",
        html: `<main style="font-family:Arial,sans-serif;line-height:1.5"><h1>Transactional email test</h1><p>This confirms that Kahel Studio OS can send transactional email through its configured production delivery path.</p><p>Test reference: ${operationId}</p></main>`,
        text: `Transactional email test\n\nThis confirms that Kahel Studio OS can send transactional email through its configured production delivery path.\n\nTest reference: ${operationId}`,
      },
    });
    results.push({ recipient, accepted });
  }
  return Response.json({ operationId, results }, { status: results.every((result) => result.accepted) ? 200 : 502, headers: { "Cache-Control": "no-store" } });
}
