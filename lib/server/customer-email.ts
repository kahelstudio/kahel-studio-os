import "server-only";

import { sendTransactionalEmail } from "./transactional-email-service";

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]!,
  );

export async function sendBookingConfirmation(input: {
  to: string;
  firstName: string;
  reference: string;
  service: string;
  date: string;
  time: string;
  location?: string;
  paymentSummary?: string;
  portalUrl: string;
  termsVersionLabel?: string;
  termsUrl?: string;
  agreementUrl?: string;
  clientId?: string;
  profileId?: string;
  bookingId?: string;
}) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.BOOKING_EMAIL_FROM;
    const replyTo = process.env.BOOKING_EMAIL_REPLY_TO;
    if (!apiKey || !from || !replyTo) return false;
    const safe = Object.fromEntries(
      Object.entries(input).map(([key, value]) => [key, escapeHtml(value)]),
    ) as Record<keyof typeof input, string>;
    return sendTransactionalEmail({
      templateKey: "booking-terms-review-request",
      logicalIdempotencyKey: `booking-confirmation-${input.bookingId ?? input.reference}`,
      triggerKey: "booking.created",
      clientId: input.clientId,
      recipientProfileId: input.profileId,
      bookingId: input.bookingId,
      recipientName: input.firstName,
      recipientSnapshot: { firstName: input.firstName, email: input.to },
      renderContext: {
        reference: input.reference,
        service: input.service,
        date: input.date,
        time: input.time,
        location: input.location,
        paymentSummary: input.paymentSummary,
        portalUrl: input.portalUrl,
        termsVersionLabel: input.termsVersionLabel,
        termsUrl: input.termsUrl,
        agreementUrl: input.agreementUrl,
      },
      message: {
        to: input.to,
        from,
        replyTo,
        subject: `Booking received · ${input.reference}`,
        html: `<div style="background:#f5f3ef;padding:32px 16px;font:16px/1.6 Arial,sans-serif;color:#1d1d1f"><div style="max-width:600px;margin:auto;background:#fff;border:1px solid #dedbd5"><div style="padding:24px 32px;background:#171717;color:#fff;font-size:20px;font-weight:700">KAHEL STUDIO</div><div style="padding:32px"><h1 style="margin:0 0 16px;font-size:28px">Booking request received</h1><p>Hi ${safe.firstName}, we saved your ${safe.service} request for ${safe.date} at ${safe.time}. This request is not automatically confirmed.</p><p><strong>Reference:</strong> ${safe.reference}</p>${safe.location ? `<p><strong>Location:</strong> ${safe.location}</p>` : ""}${safe.paymentSummary ? `<p><strong>Payment:</strong> ${safe.paymentSummary}</p>` : ""}${safe.termsVersionLabel ? `<p><strong>Booking terms:</strong> ${safe.termsVersionLabel}${safe.termsUrl ? ` · <a href="${safe.termsUrl}" style="color:#b33800">view terms</a>` : ""}</p>` : ""}<p><a href="${safe.agreementUrl || safe.portalUrl}" style="display:inline-block;margin-top:12px;padding:13px 22px;background:#FF5300;color:#fff;text-decoration:none;font-weight:700">View booking and accepted terms</a></p><p style="color:#666">If you did not make this booking, reply to this email. No password is included in this message.</p></div></div></div>`,
        text: `Booking request received\n\nHi ${input.firstName}, we saved your ${input.service} request for ${input.date} at ${input.time}. This request is not automatically confirmed.\nReference: ${input.reference}${input.location ? `\nLocation: ${input.location}` : ""}${input.paymentSummary ? `\nPayment: ${input.paymentSummary}` : ""}${input.termsVersionLabel ? `\nBooking terms: ${input.termsVersionLabel}${input.termsUrl ? `\nTerms: ${input.termsUrl}` : ""}` : ""}\n\nView booking and accepted terms: ${input.agreementUrl || input.portalUrl}\n\nIf you did not make this booking, reply to this email. No password is included in this message.`,
      },
    });
  } catch {
    return false;
  }
}

export async function sendBookingTermsReviewRequest(input: {
  to: string;
  firstName: string;
  reference: string;
  portalUrl: string;
  termsVersionLabel: string;
  termsUrl: string;
  clientId: string;
  profileId: string;
  bookingId: string;
}) {
  try {
    const from = process.env.BOOKING_EMAIL_FROM;
    const replyTo = process.env.BOOKING_EMAIL_REPLY_TO;
    if (!process.env.RESEND_API_KEY || !from || !replyTo) return false;
    const safe = Object.fromEntries(
      Object.entries(input).map(([key, value]) => [key, escapeHtml(value)]),
    ) as Record<keyof typeof input, string>;
    return sendTransactionalEmail({
      templateKey: "booking-request-received",
      logicalIdempotencyKey: `booking-terms-review-${input.bookingId}`,
      triggerKey: "booking.terms_review_requested",
      clientId: input.clientId,
      recipientProfileId: input.profileId,
      bookingId: input.bookingId,
      recipientName: input.firstName,
      recipientSnapshot: { firstName: input.firstName, email: input.to },
      renderContext: {
        reference: input.reference,
        portalUrl: input.portalUrl,
        termsVersionLabel: input.termsVersionLabel,
        termsUrl: input.termsUrl,
      },
      message: {
        to: input.to,
        from,
        replyTo,
        subject: `Review booking terms · ${input.reference}`,
        html: `<div style="background:#f5f3ef;padding:32px 16px;font:16px/1.6 Arial,sans-serif;color:#1d1d1f"><div style="max-width:600px;margin:auto;background:#fff;border:1px solid #dedbd5"><div style="padding:24px 32px;background:#171717;color:#fff;font-size:20px;font-weight:700">KAHEL STUDIO</div><div style="padding:32px"><h1 style="margin:0 0 16px;font-size:28px">Review your booking terms</h1><p>Hi ${safe.firstName}, booking ${safe.reference} is awaiting your acceptance of ${safe.termsVersionLabel}.</p><p><a href="${safe.portalUrl}" style="display:inline-block;margin:12px 0;padding:13px 22px;background:#FF5300;color:#fff;text-decoration:none;font-weight:700">Review booking and accept</a></p><p><a href="${safe.termsUrl}" style="color:#b33800">Read the complete Booking Terms and Conditions</a></p></div></div></div>`,
        text: `Review your booking terms\n\nHi ${input.firstName}, booking ${input.reference} is awaiting your acceptance of ${input.termsVersionLabel}.\n\nReview and accept: ${input.portalUrl}\nComplete terms: ${input.termsUrl}`,
      },
    });
  } catch {
    return false;
  }
}
