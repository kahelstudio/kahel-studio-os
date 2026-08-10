import "server-only";

import { getSupabaseAdmin } from "./supabase-admin";

type Notice = { recipientId: string; glitchId: string; reference: string; kind: string; title: string; body: string };

export async function notifyGlitch(notices: Notice[]) {
  const unique = [...new Map(notices.filter((notice) => notice.recipientId).map((notice) => [notice.recipientId, notice])).values()];
  if (!unique.length) return;
  const result = await getSupabaseAdmin().from("staff_notifications").insert(unique.map((notice) => ({
    recipient_id: notice.recipientId,
    request_id: null,
    event_key: `glitch:${notice.glitchId}:${notice.kind}:${notice.recipientId}:${crypto.randomUUID()}`,
    kind: `glitch_${notice.kind}`,
    title: notice.title,
    body: notice.body,
    href: `/glitches?glitch=${notice.glitchId}`,
  })));
  if (result.error) console.error("Unable to enqueue glitch notifications", result.error);
}
