import "server-only";

import { sendTransactionalEmail } from "./transactional-email-service";

const escapeHtml = (v: string) =>
  v.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function emailHeader(label: string) {
  return `<div style="padding:24px 32px;background:#1A1916;color:#fff;font-size:20px;font-weight:700;letter-spacing:.04em">${label}</div>`;
}

function emailWrapper(inner: string) {
  return `<div style="background:#f5f3ef;padding:32px 16px;font:16px/1.6 Arial,sans-serif;color:#1d1d1f"><div style="max-width:600px;margin:auto;background:#fff;border:1px solid #dedbd5">${inner}</div></div>`;
}

function ctaButton(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;margin-top:16px;padding:13px 22px;background:#FF5300;color:#fff;text-decoration:none;font-weight:700;border-radius:4px">${label}</a>`;
}

function detailRow(label: string, value: string) {
  return `<tr><td style="padding:8px 0;color:#666;font-size:14px;width:40%;vertical-align:top">${label}</td><td style="padding:8px 0;font-weight:600">${value}</td></tr>`;
}

export async function sendWaitlistConfirmation(input: {
  to: string;
  firstName: string;
  serviceName: string;
  preferredWindow: string;
  waitlistId: string;
}) {
  const from = process.env.BOOKING_EMAIL_FROM;
  const replyTo = process.env.BOOKING_EMAIL_REPLY_TO;
  if (!process.env.RESEND_API_KEY || !from || !replyTo) return false;
  const s = {
    firstName: escapeHtml(input.firstName),
    serviceName: escapeHtml(input.serviceName),
    preferredWindow: escapeHtml(input.preferredWindow),
  };
  const bookUrl = "https://kahelstudio.com/book";
  const html = emailWrapper(
    emailHeader("KAHEL STUDIO") +
    `<div style="padding:32px"><h1 style="margin:0 0 16px;font-size:28px">You're on the waitlist!</h1>` +
    `<p>Hi ${s.firstName}, you've been added to the Kahel Studio waitlist.</p>` +
    `<table style="margin:20px 0;border-collapse:collapse;width:100%">` +
    detailRow("Session type", s.serviceName) +
    detailRow("Preferred window", s.preferredWindow) +
    `</table>` +
    `<p>We'll email you as soon as a slot opens. No action needed from you right now.</p>` +
    ctaButton(bookUrl, "View available dates") +
    `<p style="margin-top:28px;color:#888;font-size:14px">Kahel Studio · Cobo, Tabaco City, Albay</p></div>`
  );
  const text = `You're on the Kahel Studio waitlist!\n\nHi ${input.firstName},\n\nSession type: ${input.serviceName}\nPreferred window: ${input.preferredWindow}\n\nWe'll email you when a slot opens.\n\n${bookUrl}`;
  return sendTransactionalEmail({
    templateKey: "waitlist-confirmation",
    logicalIdempotencyKey: `waitlist-confirm-${input.waitlistId}`,
    triggerKey: "waitlist.joined",
    recipientName: input.firstName,
    recipientSnapshot: { firstName: input.firstName, email: input.to },
    renderContext: { serviceName: input.serviceName, preferredWindow: input.preferredWindow },
    message: { to: input.to, from, replyTo, subject: "You're on the Kahel Studio waitlist", html, text },
  });
}

export async function sendWaitlistAdminNotification(input: {
  name: string;
  email: string;
  phone?: string | null;
  serviceName: string;
  preferredWindow: string;
  timeOfDay: string;
  notes?: string | null;
  waitlistId: string;
}) {
  const from = process.env.BOOKING_EMAIL_FROM;
  const adminTo = process.env.ADMIN_NOTIFICATION_EMAIL ?? process.env.BOOKING_EMAIL_REPLY_TO;
  if (!process.env.RESEND_API_KEY || !from || !adminTo) return false;
  const s = {
    name: escapeHtml(input.name),
    email: escapeHtml(input.email),
    phone: escapeHtml(input.phone ?? "—"),
    serviceName: escapeHtml(input.serviceName),
    preferredWindow: escapeHtml(input.preferredWindow),
    timeOfDay: escapeHtml(input.timeOfDay),
    notes: escapeHtml(input.notes ?? "—"),
  };
  const dashUrl = "https://dashboard.kahelstudio.com/booking/waitlist";
  const html = emailWrapper(
    emailHeader("KAHEL STUDIO — ADMIN") +
    `<div style="padding:32px"><h1 style="margin:0 0 16px;font-size:24px">New waitlist entry</h1>` +
    `<table style="margin:20px 0;border-collapse:collapse;width:100%">` +
    detailRow("Name", s.name) +
    detailRow("Email", s.email) +
    detailRow("Phone", s.phone) +
    detailRow("Session type", s.serviceName) +
    detailRow("Preferred window", s.preferredWindow) +
    detailRow("Time of day", s.timeOfDay) +
    `<tr><td style="padding:8px 0;color:#666;font-size:14px;vertical-align:top">Notes</td><td style="padding:8px 0;color:#555;font-size:14px">${s.notes}</td></tr>` +
    `</table>` +
    ctaButton(dashUrl, "View Waitlist in Dashboard") +
    `</div>`
  );
  const text = `New waitlist entry\n\nName: ${input.name}\nEmail: ${input.email}\nPhone: ${input.phone ?? "—"}\nSession: ${input.serviceName}\nWindow: ${input.preferredWindow}\nTime: ${input.timeOfDay}\nNotes: ${input.notes ?? "—"}\n\n${dashUrl}`;
  return sendTransactionalEmail({
    templateKey: "internal-new-waitlist-entry",
    logicalIdempotencyKey: `waitlist-admin-${input.waitlistId}`,
    triggerKey: "waitlist.joined",
    message: { to: adminTo, from, subject: `New waitlist entry · ${input.name}`, html, text },
  });
}

export async function sendWaitlistSlotAvailable(input: {
  to: string;
  firstName: string;
  serviceName: string;
  waitlistId: string;
}) {
  const from = process.env.BOOKING_EMAIL_FROM;
  const replyTo = process.env.BOOKING_EMAIL_REPLY_TO;
  if (!process.env.RESEND_API_KEY || !from || !replyTo) return false;
  const s = {
    firstName: escapeHtml(input.firstName),
    serviceName: escapeHtml(input.serviceName),
  };
  const bookUrl = "https://kahelstudio.com/book";
  const html = emailWrapper(
    emailHeader("KAHEL STUDIO") +
    `<div style="padding:32px"><h1 style="margin:0 0 16px;font-size:28px">Your waitlist slot is available!</h1>` +
    `<p>Hi ${s.firstName}, a slot has opened for <strong>${s.serviceName}</strong>. Slots go fast — book now to claim yours.</p>` +
    ctaButton(bookUrl, "Book your slot now") +
    `<p style="margin-top:28px;color:#888;font-size:14px">Kahel Studio · Cobo, Tabaco City, Albay</p></div>`
  );
  const text = `Your waitlist slot is available!\n\nHi ${input.firstName}, a slot has opened for ${input.serviceName}.\n\nBook now: ${bookUrl}`;
  return sendTransactionalEmail({
    templateKey: "waitlist-slot-available",
    logicalIdempotencyKey: `waitlist-slot-${input.waitlistId}`,
    triggerKey: "waitlist.notified",
    recipientName: input.firstName,
    recipientSnapshot: { firstName: input.firstName, email: input.to },
    renderContext: { serviceName: input.serviceName },
    message: { to: input.to, from, replyTo, subject: "A Kahel Studio slot is now available", html, text },
  });
}
