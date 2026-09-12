import { KAHEL_LOGO_URL, KAHEL_LOGO_DATA_URI } from "@/lib/email-preview-utils";

const LOGO_URL = KAHEL_LOGO_URL;
const LOGO_DATA_URI = KAHEL_LOGO_DATA_URI;

const H1 = `style="margin:0 0 16px;font-size:26px;font-weight:600;color:#1A1916;line-height:1.3;"`;
const BODY_P = `style="margin:0 0 32px;font-size:16px;line-height:1.7;color:#6B6860;"`;
const BTN = `style="display:inline-block;background-color:#FF5300;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:50px;font-weight:700;font-size:16px;"`;
const SMALL = `style="font-size:14px;color:#A8A69E;"`;
const HR = `style="border:none;border-top:1px solid #E4E2DC;margin:24px 0;"`;
const HELP_P = `style="margin:0 0 8px;font-size:13px;line-height:1.7;color:#A8A69E;"`;
const LINK = `style="color:#FF5300;text-decoration:none;"`;

function makeEmailHtml(title: string, preheader: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#ECEAE4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#ECEAE4;opacity:0;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ECEAE4;padding:48px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;width:600px;max-width:100%;">
        <tr><td style="background-color:#1A1916;padding:32px 48px;">
          <img src="${LOGO_URL}" width="200" height="29" alt="Kahel Studio" style="display:block;border:0;outline:none;text-decoration:none;">
          <p style="margin:12px 0 0 0;font-size:13px;color:#B7B2A8;">Creating Visual Experiences</p>
        </td></tr>
        <tr><td style="height:4px;background-color:#FF5300;"></td></tr>
        <tr><td style="padding:48px 48px 40px;">${body}</td></tr>
        <tr><td style="padding:24px 48px 36px;border-top:1px solid #E4E2DC;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#A8A69E;">&copy; 2026 Kahel Studio. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const HELP = `<p ${HELP_P}>Need help? <a href="mailto:support@kahelstudio.com" ${LINK}>support@kahelstudio.com</a></p>`;

function fallbackLink(label: string, token: string) {
  return `<p ${HELP_P}>Button not working? <a href="${token}" ${LINK}>Click here to ${label}</a> instead.</p>`;
}

export type AuthEmailTemplate = {
  key: string;
  name: string;
  type: string;
  subject: string;
  previewVars: Record<string, string>;
  html: string;
};

export const AUTH_EMAIL_TEMPLATES: AuthEmailTemplate[] = [
  {
    key: "confirm-signup",
    name: "Confirm Signup",
    type: "Account confirmation",
    subject: "Confirm your email — Kahel Studio",
    previewVars: { "{{ .ConfirmationURL }}": "#preview" },
    html: makeEmailHtml(
      "Confirm your email — Kahel Studio",
      "Confirm your email to activate your Kahel Studio account.",
      `<h1 ${H1}>Confirm your email</h1>
      <p ${BODY_P}>Welcome to Kahel Studio! Please confirm your email address to activate your account and get access to your workspace.</p>
      <a href="{{ .ConfirmationURL }}" ${BTN}>Confirm Email</a>
      <hr ${HR}>
      ${fallbackLink("confirm your email", "{{ .ConfirmationURL }}")}
      <p style="margin:16px 0 0;font-size:13px;color:#A8A69E;">Need help? <a href="mailto:support@kahelstudio.com" ${LINK}>support@kahelstudio.com</a></p>`,
    ),
  },
  {
    key: "invite-user",
    name: "Invite User",
    type: "Invitation",
    subject: "You've been invited — Kahel Studio",
    previewVars: { "{{ .ConfirmationURL }}": "#preview" },
    html: makeEmailHtml(
      "You’ve been invited — Kahel Studio",
      "You’ve been invited to join Kahel Studio.",
      `<h1 ${H1}>You&rsquo;ve been invited</h1>
      <p ${BODY_P}>You&rsquo;ve been invited to create a Kahel Studio account. Click the button below to accept your invitation and get access to your workspace.</p>
      <a href="{{ .ConfirmationURL }}" ${BTN}>Accept Invitation</a>
      <hr ${HR}>
      ${fallbackLink("accept your invitation", "{{ .ConfirmationURL }}")}
      <p style="margin:16px 0 0;font-size:13px;color:#A8A69E;">Need help? <a href="mailto:support@kahelstudio.com" ${LINK}>support@kahelstudio.com</a></p>`,
    ),
  },
  {
    key: "magic-link",
    name: "Magic Link",
    type: "Sign-in link",
    subject: "Your sign-in link — Kahel Studio",
    previewVars: { "{{ .ConfirmationURL }}": "#preview" },
    html: makeEmailHtml(
      "Your sign-in link — Kahel Studio",
      "Your Kahel Studio sign-in link — expires shortly.",
      `<h1 ${H1}>Your sign-in link</h1>
      <p ${BODY_P}>Click the button below to sign in to your Kahel Studio Dashboard. This link expires shortly and can only be used once.</p>
      <a href="{{ .ConfirmationURL }}" ${BTN}>Sign In</a>
      <p style="margin:28px 0 8px;${SMALL.slice(8)}">If you did not request this link, you can safely ignore this email.</p>
      <hr ${HR}>
      ${fallbackLink("sign in", "{{ .ConfirmationURL }}")}
      <p style="margin:16px 0 0;font-size:13px;color:#A8A69E;">Need help? <a href="mailto:support@kahelstudio.com" ${LINK}>support@kahelstudio.com</a></p>`,
    ),
  },
  {
    key: "reauthentication",
    name: "Reauthentication",
    type: "OTP code",
    subject: "Your verification code — Kahel Studio",
    previewVars: { "{{ .Token }}": "847 291" },
    html: makeEmailHtml(
      "Your verification code — Kahel Studio",
      "Your Kahel Studio verification code.",
      `<h1 ${H1}>Your verification code</h1>
      <p ${BODY_P}>Use the code below to verify your identity. It expires shortly and can only be used once.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 32px 0;">
        <tr><td style="background-color:#F5F3EF;border-radius:12px;padding:24px 40px;text-align:center;">
          <p style="margin:0 0 6px;font-size:12px;color:#A8A69E;letter-spacing:0.08em;text-transform:uppercase;">Verification Code</p>
          <p style="margin:0;font-size:40px;font-weight:700;color:#1A1916;letter-spacing:0.15em;font-family:'Courier New',Courier,monospace;">{{ .Token }}</p>
        </td></tr>
      </table>
      <p style="margin:0 0 0;font-size:14px;line-height:1.7;color:#A8A69E;">If you did not request this code, you can safely ignore this email. Your account remains secure.</p>
      <hr ${HR}>
      <p style="margin:0;font-size:13px;color:#A8A69E;">Need help? <a href="mailto:support@kahelstudio.com" ${LINK}>support@kahelstudio.com</a></p>`,
    ),
  },
  {
    key: "reset-password",
    name: "Reset Password",
    type: "Password reset",
    subject: "Reset your Dashboard password — Kahel Studio",
    previewVars: { "{{ .ConfirmationURL }}": "#preview" },
    html: makeEmailHtml(
      "Reset your Dashboard password — Kahel Studio",
      "Reset your Kahel Studio Dashboard password — this link expires in 1 hour.",
      `<h1 ${H1}>Reset your Dashboard password</h1>
      <p ${BODY_P}>A password reset was requested for your Kahel Studio Dashboard account. Click the button below to create a new password and regain access to your workspace.</p>
      <a href="{{ .ConfirmationURL }}" ${BTN}>Reset Password</a>
      <p style="margin:28px 0 8px;font-size:14px;color:#A8A69E;">This link expires in 1 hour.</p>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#A8A69E;">If you did not request this password reset, no further action is required. Your account remains secure and your password will not be changed.</p>
      <hr ${HR}>
      ${fallbackLink("reset your password", "{{ .ConfirmationURL }}")}
      <p style="margin:16px 0 0;font-size:13px;color:#A8A69E;">Need help? <a href="mailto:support@kahelstudio.com" ${LINK}>support@kahelstudio.com</a></p>`,
    ),
  },
  {
    key: "change-email",
    name: "Change Email",
    type: "Email change",
    subject: "Confirm your new email address — Kahel Studio",
    previewVars: {
      "{{ .NewEmail }}": "newemail@example.com",
      "{{ .ConfirmationURL }}": "#preview",
    },
    html: makeEmailHtml(
      "Confirm your new email address — Kahel Studio",
      "Confirm your new email address for your Kahel Studio account.",
      `<h1 ${H1}>Confirm your new email address</h1>
      <p ${BODY_P}>Click the button below to confirm <strong style="color:#1A1916;">{{ .NewEmail }}</strong> as your new email address for your Kahel Studio Dashboard account.</p>
      <a href="{{ .ConfirmationURL }}" ${BTN}>Confirm New Email</a>
      <p style="margin:28px 0 8px;font-size:14px;color:#A8A69E;">If you didn&rsquo;t request this change, you can safely ignore this email. Your current email address will remain unchanged.</p>
      <hr ${HR}>
      ${fallbackLink("confirm your new email", "{{ .ConfirmationURL }}")}
      <p style="margin:16px 0 0;font-size:13px;color:#A8A69E;">Need help? <a href="mailto:support@kahelstudio.com" ${LINK}>support@kahelstudio.com</a></p>`,
    ),
  },
];

export function resolveAuthTemplateHtml(template: AuthEmailTemplate, vars?: Record<string, string>): string {
  let html = template.html;
  for (const [token, value] of Object.entries(vars ?? template.previewVars)) {
    html = html.split(token).join(value);
  }
  return html.replace(LOGO_URL, LOGO_DATA_URI);
}
