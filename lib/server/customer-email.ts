import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

type EmailBinding = { send(message: { to: string; from: { email: string; name: string }; replyTo: string; subject: string; html: string; text: string }): Promise<unknown> };

const escapeHtml = (value: string) => value.replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]!);

export async function sendBookingConfirmation(input: { to: string; firstName: string; reference: string; service: string; date: string; time: string; portalUrl: string }) {
  try {
    const context = await getCloudflareContext({ async: true });
    const email = (context.env as unknown as { EMAIL?: EmailBinding }).EMAIL;
    if (!email) return false;
    const from = process.env.BOOKING_EMAIL_FROM;
    const replyTo = process.env.BOOKING_EMAIL_REPLY_TO;
    if (!from || !replyTo) return false;
    const safe = Object.fromEntries(Object.entries(input).map(([key, value]) => [key, escapeHtml(value)])) as Record<keyof typeof input, string>;
    await email.send({
      to: input.to,
      from: { email: from, name: "Kahel Studio" },
      replyTo,
      subject: `Booking received · ${input.reference}`,
      html: `<div style="background:#f5f3ef;padding:32px 16px;font:16px/1.6 Arial,sans-serif;color:#1d1d1f"><div style="max-width:600px;margin:auto;background:#fff;border:1px solid #dedbd5"><div style="padding:24px 32px;background:#171717;color:#fff;font-size:20px;font-weight:700">KAHEL STUDIO</div><div style="padding:32px"><h1 style="margin:0 0 16px;font-size:28px">Booking received</h1><p>Hi ${safe.firstName}, we saved your ${safe.service} request for ${safe.date} at ${safe.time}.</p><p><strong>Reference:</strong> ${safe.reference}</p><p><a href="${safe.portalUrl}" style="display:inline-block;margin-top:12px;padding:13px 22px;background:#FF5300;color:#fff;text-decoration:none;font-weight:700">Sign in to view your booking</a></p><p style="color:#666">If you did not make this booking, reply to this email. No password is included in this message.</p></div></div></div>`,
      text: `Booking received\n\nHi ${input.firstName}, we saved your ${input.service} request for ${input.date} at ${input.time}.\nReference: ${input.reference}\n\nSign in to view your booking: ${input.portalUrl}\n\nIf you did not make this booking, reply to this email. No password is included in this message.`,
    });
    return true;
  } catch {
    return false;
  }
}
