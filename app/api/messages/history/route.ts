import { getStaffPrincipal } from "@/lib/server/staff-auth";
import { canAccessMessages } from "@/lib/messages";
import { getEmailHistory } from "@/lib/server/messages-data";

const keys = ["clientId", "bookingId", "bookingReference", "projectId", "projectReference", "paymentId", "galleryId"] as const;

export async function GET(request: Request) {
  const principal = await getStaffPrincipal(request);
  if (!principal) return Response.json({ error: "Authentication required." }, { status: 401 });
  if (!canAccessMessages(principal)) return Response.json({ error: "Message history permission is required." }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const context: Partial<Record<(typeof keys)[number], string>> = {};
  for (const key of keys) { const value = params.get(key)?.trim(); if (value) context[key] = value.slice(0, 200); }
  if (!Object.keys(context).length) return Response.json({ error: "A canonical record identifier is required." }, { status: 400 });
  return Response.json(await getEmailHistory(principal, context), { headers: { "Cache-Control": "private, no-store" } });
}
