import { Webhook } from "svix";
import { recordResendProviderEvent } from "@/lib/server/transactional-email-service";

export const runtime = "nodejs";

type ResendEvent = { type?: unknown; created_at?: unknown; data?: { email_id?: unknown } };

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "Webhook is not configured." }, { status: 503 });
  const rawBody = await request.text();
  let event: ResendEvent;
  try {
    event = new Webhook(secret).verify(rawBody, {
      "svix-id": request.headers.get("svix-id") ?? "",
      "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
      "svix-signature": request.headers.get("svix-signature") ?? "",
    }) as ResendEvent;
  } catch {
    return Response.json({ error: "Invalid signature." }, { status: 401 });
  }
  const eventId = request.headers.get("svix-id")!;
  const type = typeof event.type === "string" ? event.type : "";
  const providerMessageId = typeof event.data?.email_id === "string" ? event.data.email_id : "";
  const date = typeof event.created_at === "string" ? new Date(event.created_at) : new Date();
  if (!type || !providerMessageId || Number.isNaN(date.getTime())) return Response.json({ received: true });
  try {
    await recordResendProviderEvent({ eventId, type, providerMessageId, occurredAt: date.toISOString() });
  } catch (error) {
    console.error("[resend-webhook] Event persistence failed", eventId, error instanceof Error ? error.message : "unknown");
    return Response.json({ error: "Webhook persistence failed." }, { status: 503 });
  }
  return Response.json({ received: true });
}
