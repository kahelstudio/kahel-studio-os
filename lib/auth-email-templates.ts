const LOGO_URL = "https://dashboard.kahelstudio.com/kahelstudio-logo-email.png";

// White wordmark SVG inlined as a data URI — used so preview works without network access.
const LOGO_DATA_URI =
  "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+PCFET0NUWVBFIHN2ZyBQVUJMSUMgIi0vL1czQy8vRFREIFNWRyAxLjEvL0VOIiAiaHR0cDovL3d3dy53My5vcmcvR3JhcGhpY3MvU1ZHLzEuMS9EVEQvc3ZnMTEuZHRkIj48c3ZnIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHZpZXdCb3g9IjAgMCA0OTMgNzIiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSIgeG1sbnM6c2VyaWY9Imh0dHA6Ly93d3cuc2VyaWYuY29tLyIgc3R5bGU9ImZpbGwtcnVsZTpldmVub2RkO2NsaXAtcnVsZTpldmVub2RkO3N0cm9rZS1saW5lam9pbjpyb3VuZDtzdHJva2UtbWl0ZXJsaW1pdDoyOyI+PGcgaWQ9IkxheWVyLTEiIHNlcmlmOmlkPSJMYXllciAxIj48Zz48cGF0aCBkPSJNMCw2LjU2MWwxNy4xNDcsMGwwLDM0LjkwOWwxMy41NjEsLTE5LjI0OWwyMC41NjEsMGwtMTkuMzM2LDI0LjY3MmwxOS42ODYsMjQuNDFsLTIwLjkxMSwwbC0xMy41NjEsLTIwLjEyM2wwLDIwLjEyM2wtMTcuMTQ3LDBsMCwtNjQuNzQyWiIgc3R5bGU9ImZpbGw6I2ZmZjtmaWxsLXJ1bGU6bm9uemVybzsiLz48L2c+PGc+PHBhdGggZD0iTTc1Ljg0NSwzNi41N2MtNC44OTksMCAtOC45MjQsMy40OTkgLTguOTI0LDEwLjE0OWMwLDYuNTYxIDQuMDI2LDEwLjIzNSA4LjkyNCwxMC4yMzVjNC44MTEsMCA4LjkyMiwtMy41ODYgOC45MjIsLTEwLjIzNWMwLC02LjU2MyAtNC4xMTEsLTEwLjE0OSAtOC45MjIsLTEwLjE0OW0tNS41MTEsLTE0Ljk2YzYuOTk4LDAgMTEuODk3LDMuMDYyIDE0LjQzMyw3LjQzN2wwLC02LjgyNWwxNy4xNDksMGwwLDQ5LjA4MmwtMTcuMTQ5LDBsMCwtNi44MjVjLTIuNTM3LDQuMzc2IC03LjUyMyw3LjQzNyAtMTQuNDMzLDcuNDM3Yy0xMS42MzYsMCAtMjAuOTExLC05LjUzNyAtMjAuOTExLC0yNS4xOTdjMCwtMTUuNjYgOS4yNzQsLTI1LjEwOSAyMC45MTEsLTI1LjEwOSIgc3R5bGU9ImZpbGw6I2ZmZjtmaWxsLXJ1bGU6bm9uemVybzsiLz48L2c+PGc+PHBhdGggZD0iTTEwNy4zMzEsNi41NjFsMTcuMTQ4LDBsMCwyMi42NmMyLjg4OSwtNC4xOTkgOC4wNSwtNy40MzcgMTUuMTM1LC03LjQzN2MxMS4xOTksMCAxOC4yODYsOC4wNSAxOC4yODYsMjAuOTExbDAsMjguNjA4bC0xNy4xNDcsMGwwLC0yNi4zMzRjMCwtNS42ODggLTMuMTUxLC05LjAxMiAtOC4wNSwtOS4wMTJjLTUuMDc2LDAgLTguMjI1LDMuMzI0IC04LjIyNSw5LjAxMmwwLDI2LjMzNGwtMTcuMTQ3LDBsMCwtNjQuNzQyWiIgc3R5bGU9ImZpbGw6I2ZmZjtmaWxsLXJ1bGU6bm9uemVybzsiLz48L2c+PGc+PHBhdGggZD0iTTE3Ny4yMjcsNDEuOTA3bDE1LjEzNSwwYzAsLTQuMzc0IC0zLjQxMiwtNi43MzggLTcuMzQ4LC02LjczOGMtNC4xMTEsMCAtNywyLjI3NiAtNy43ODcsNi43MzhtNy44NzUsMzAuMDA4Yy0xNC41MjMsMCAtMjQuOTM0LC05LjUzNyAtMjQuOTM0LC0yNS4xOTdjMCwtMTUuNTczIDEwLjIzNywtMjUuMTA3IDI0LjkzNCwtMjUuMTA3YzE0LjUyMywwIDI0Ljc2LDkuMzYgMjQuNzYsMjQuNTgzYzAsMS4zMTIgLTAuMDg3LDIuNzE0IC0wLjI2Miw0LjAyNmwtMzIuNDU5LDBjMC4zNSw1LjY4NiAzLjQxMiw3Ljk2IDcuMjYyLDcuOTZjMy4zMjQsMCA1LjE2MSwtMS44MzcgNi4xMjMsLTMuODQ5bDE4LjI4NiwwYy0yLjI3NiwxMC4wNjIgLTExLjQ2MSwxNy41ODUgLTIzLjcxLDE3LjU4NSIgc3R5bGU9ImZpbGw6I2ZmZjtmaWxsLXJ1bGU6bm9uemVybzsiLz48L2c+PGc+PHJlY3QgeD0iMjEyLjQ3OCIgeT0iNi41NjEiIHdpZHRoPSIxNy4xNDkiIGhlaWdodD0iNjQuNzQyIiBzdHlsZT0iZmlsbDojZmZmOyIvPjwvZz48Zz48cGF0aCBkPSJNMjUzLjk2OCw3MS45MTVjLTEzLjY0OCwwIC0yMi43NDgsLTcuMzUgLTIzLjQ0NywtMTcuMTQ3bDE2LjYyMiwwYzAuNDM5LDMuMjM3IDMuMTUxLDQuOTg2IDYuNzM4LDQuOTg2YzIuODg3LDAgNC41NDksLTEuNCA0LjU0OSwtMy4xNDljMCwtNy4xNzUgLTI2LjA3MiwtMS4zMTIgLTI2LjA3MiwtMTkuMzM2YzAsLTguNTczIDcuMDg3LC0xNS42NiAyMC4zODYsLTE1LjY2YzEzLjM4NiwwIDIwLjM4NCw3LjQzNyAyMS41MjEsMTcuMTQ3bC0xNS40ODUsMGMtMC41MjUsLTMuMDYyIC0yLjcxMiwtNC44OTkgLTYuMzg2LC00Ljg5OWMtMi43OTksMCAtNC4yODYsMS4xMzcgLTQuMjg2LDIuOTc2YzAsNi45OTggMjYuMTU3LDEuNCAyNi4yNDUsMjAuMDM0YzAsOC41NzUgLTcuNjk4LDE1LjA0OCAtMjAuMzg0LDE1LjA0OCIgc3R5bGU9ImZpbGw6I2ZmZjtmaWxsLXJ1bGU6bm9uemVybzsiLz48L2c+PGc+PHBhdGggZD0iTTI4MS4wODMsMzYuNDgybC02LjAzOCwwbDAsLTE0LjI2bDYuMDM4LDBsMCwtMTEuODk5bDE3LjIzNSwwbDAsMTEuODk5bDguOTI0LDBsMCwxNC4yNmwtOC45MjQsMGwwLDE2LjQ0N2MwLDIuNjI0IDEuMTM3LDMuNzYzIDQuMDI0LDMuNzYzbDQuOTg4LDBsMCwxNC42MWwtNy40MzcsMGMtMTAuODQ5LDAgLTE4LjgwOSwtNC41NTEgLTE4LjgwOSwtMTguNjM2bDAsLTE2LjE4NWwtMC4wMDEsMC4wMDFaIiBzdHlsZT0iZmlsbDojZmZmO2ZpbGwtcnVsZTpub256ZXJvOyIvPjwvZz48Zz48cGF0aCBkPSJNMzYxLjA0Miw3MS4zMDNsLTE3LjIzNSwwbDAsLTdjLTIuODAxLDQuMjAxIC03Ljk2Miw3LjQzNyAtMTQuODczLDcuNDM3Yy0xMS4zNzQsMCAtMTguNDYxLC04LjA1IC0xOC40NjEsLTIwLjk5NmwwLC0yOC41MjFsMTcuMDYyLDBsMCwyNi4zMzJjMCw1LjY4OCAzLjIzNyw5LjAxMiA4LjEzNSw5LjAxMmM0Ljk4OCwwIDguMTM3LC0zLjMyNCA4LjEzNywtOS4wMTJsMCwtMjYuMzMybDE3LjIzNSwwbDAsNDkuMDhaIiBzdHlsZT0iZmlsbDojZmZmO2ZpbGwtcnVsZTpub256ZXJvOyIvPjwvZz48Zz48cGF0aCBkPSJNMzkwLjA4LDM2LjU3Yy00Ljg5OSwwIC04LjkyNCwzLjQ5OSAtOC45MjQsMTAuMTQ5YzAsNi41NjEgNC4wMjYsMTAuMjM1IDguOTI0LDEwLjIzNWM0LjgxMSwwIDguOTIyLC0zLjU4NiA4LjkyMiwtMTAuMjM1YzAsLTYuNTYzIC00LjExMSwtMTAuMTQ5IC04LjkyMiwtMTAuMTQ5bS01LjQyNSwtMTQuOTZjNi40NzMsMCAxMS41NDksMi44ODcgMTQuMjYsNy4zNDhsMCwtMjIuMzk2bDE3LjIzNSwwbDAsNjQuNzQybC0xNy4yMzUsMGwwLC02LjgyNWMtMi41MzcsNC4zNzYgLTcuNDM1LDcuNDM3IC0xNC4zNDYsNy40MzdjLTExLjYzNiwwIC0yMC45MTEsLTkuNTM3IC0yMC45MTEsLTI1LjE5N2MwLC0xNS42NiA5LjI3NCwtMjUuMTA5IDIwLjk5NiwtMjUuMTA5IiBzdHlsZT0iZmlsbDojZmZmO2ZpbGwtcnVsZTpub256ZXJvOyIvPjwvZz48Zz48cGF0aCBkPSJNNDIxLjU2OCwyMi4yMjNsMTcuMTQ3LDBsMCw0OS4wOGwtMTcuMTQ3LDBsMCwtNDkuMDhabS0xLjQsLTEzLjI5OGMwLC00Ljk4OCAzLjkzNiwtOC45MjQgMTAuMDYsLTguOTI0YzYuMDM2LDAgOS45NzQsMy45MzYgOS45NzQsOC45MjRjMCw0Ljg5OSAtMy45MzgsOC43NDggLTkuOTc0LDguNzQ4Yy02LjEyMywwIC0xMC4wNiwtMy44NDkgLTEwLjA2LC04Ljc0OCIgc3R5bGU9ImZpbGw6I2ZmZjtmaWxsLXJ1bGU6bm9uemVybzsiLz48L2c+PGc+PHBhdGggZD0iTTQ2Ni45NzEsNTcuMDQyYzQuMzc0LDAgOC40LC0zLjIzNyA4LjQsLTEwLjMyNGMwLC02Ljk5OCAtMy45MzgsLTEwLjIzNyAtOC4zMTIsLTEwLjIzN2MtNC4zNzYsMCAtOC4yMjUsMy4yMzkgLTguMjI1LDEwLjIzN2MwLDcuMDg3IDMuNjc0LDEwLjMyNCA4LjEzNywxMC4zMjRtMCwxNC44NzNjLTE0LjYxMiwwIC0yNS42MzYsLTkuNTM3IC0yNS42MzYsLTI1LjE5N2MwLC0xNS41NzMgMTEuMTExLC0yNS4xMDkgMjUuNzI0LC0yNS4xMDljMTQuNjEsMCAyNS43Miw5LjUzNyAyNS43MiwyNS4xMDljMCwxNS42NiAtMTEuMTk3LDI1LjE5NyAtMjUuODA3LDI1LjE5NyIgc3R5bGU9ImZpbGw6I2ZmZjtmaWxsLXJ1bGU6bm9uemVybzsiLz48L2c+PC9nPjwvc3ZnPg==";

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
