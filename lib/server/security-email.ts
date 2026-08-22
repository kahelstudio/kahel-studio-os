import "server-only";

import { sendTransactionalEmail } from "./transactional-email-service";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);

async function sendSecurityEmail(input: { to: string; subject: string; html: string; text: string; templateKey: "security-recovery-code" | "security-password-reset"; operationId: string; recipientUserId?: string }) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return false;
    const from = process.env.BOOKING_EMAIL_FROM ?? "security@kahelstudio.com";
    const replyTo = process.env.BOOKING_EMAIL_REPLY_TO ?? from;
    return sendTransactionalEmail({ templateKey: input.templateKey, logicalIdempotencyKey: `${input.templateKey}:${input.operationId}`, triggerKey: input.templateKey, recipientUserId: input.recipientUserId, secure: true, maxAttempts: 1, message: { to: input.to, subject: input.subject, html: input.html, text: input.text, from, replyTo } });
  } catch {
    return false;
  }
}

export async function sendRecoveryEmailCode(to: string, code: string, operationId = crypto.randomUUID(), recipientUserId?: string) {
  const safeCode = escapeHtml(code);
  return sendSecurityEmail({
    to,
    templateKey: "security-recovery-code",
    operationId,
    recipientUserId,
    subject: "Verify your Kahel Studio recovery email",
    html: `<div style="background:#f5f3ef;padding:32px 16px;font:16px/1.6 Arial,sans-serif;color:#1d1d1f"><div style="max-width:560px;margin:auto;background:#fff;border:1px solid #dedbd5;padding:32px"><h1 style="margin:0 0 16px;font-size:26px">Verify recovery email</h1><p>Enter this code in Kahel Studio OS:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px">${safeCode}</p><p style="color:#666">This code expires in 10 minutes. If you did not request this change, ignore this email.</p></div></div>`,
    text: `Verify your Kahel Studio recovery email\n\nCode: ${code}\n\nThis code expires in 10 minutes.`,
  });
}

export async function sendRecoveryPasswordLink(to: string, link: string) {
  const safeLink = escapeHtml(link);
  return sendSecurityEmail({
    to,
    templateKey: "security-password-reset",
    operationId: crypto.randomUUID(),
    subject: "Reset your Kahel Studio password",
    html: `<div style="background:#f5f3ef;padding:32px 16px;font:16px/1.6 Arial,sans-serif;color:#1d1d1f"><div style="max-width:560px;margin:auto;background:#fff;border:1px solid #dedbd5;padding:32px"><h1 style="margin:0 0 16px;font-size:26px">Reset your password</h1><p><a href="${safeLink}" style="display:inline-block;padding:13px 22px;background:#FF5300;color:#fff;text-decoration:none;font-weight:700">Reset password</a></p><p style="color:#666">If you did not request this reset, ignore this email.</p></div></div>`,
    text: `Reset your Kahel Studio password\n\n${link}\n\nIf you did not request this reset, ignore this email.`,
  });
}
