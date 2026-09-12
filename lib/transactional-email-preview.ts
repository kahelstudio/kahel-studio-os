import type { TransactionalEmailTemplate } from "@/lib/transactional-emails";

const LOGO_URL = "https://dashboard.kahelstudio.com/kahelstudio-logo-email.png";

// White wordmark SVG inlined as a data URI so the preview works without network access.
const LOGO_DATA_URI =
  "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+PCFET0NUWVBFIHN2ZyBQVUJMSUMgIi0vL1czQy8vRFREIFNWRyAxLjEvL0VOIiAiaHR0cDovL3d3dy53My5vcmcvR3JhcGhpY3MvU1ZHLzEuMS9EVEQvc3ZnMTEuZHRkIj48c3ZnIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHZpZXdCb3g9IjAgMCA0OTMgNzIiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSIgeG1sbnM6c2VyaWY9Imh0dHA6Ly93d3cuc2VyaWYuY29tLyIgc3R5bGU9ImZpbGwtcnVsZTpldmVub2RkO2NsaXAtcnVsZTpldmVub2RkO3N0cm9rZS1saW5lam9pbjpyb3VuZDtzdHJva2UtbWl0ZXJsaW1pdDoyOyI+PGcgaWQ9IkxheWVyLTEiIHNlcmlmOmlkPSJMYXllciAxIj48Zz48cGF0aCBkPSJNMCw2LjU2MWwxNy4xNDcsMGwwLDM0LjkwOWwxMy41NjEsLTE5LjI0OWwyMC41NjEsMGwtMTkuMzM2LDI0LjY3MmwxOS42ODYsMjQuNDFsLTIwLjkxMSwwbC0xMy41NjEsLTIwLjEyM2wwLDIwLjEyM2wtMTcuMTQ3LDBsMCwtNjQuNzQyWiIgc3R5bGU9ImZpbGw6I2ZmZjtmaWxsLXJ1bGU6bm9uemVybzsiLz48L2c+PGc+PHBhdGggZD0iTTc1Ljg0NSwzNi41N2MtNC44OTksMCAtOC45MjQsMy40OTkgLTguOTI0LDEwLjE0OWMwLDYuNTYxIDQuMDI2LDEwLjIzNSA4LjkyNCwxMC4yMzVjNC44MTEsMCA4LjkyMiwtMy41ODYgOC45MjIsLTEwLjIzNWMwLC02LjU2MyAtNC4xMTEsLTEwLjE0OSAtOC45MjIsLTEwLjE0OW0tNS41MTEsLTE0Ljk2YzYuOTk4LDAgMTEuODk3LDMuMDYyIDE0LjQzMyw3LjQzN2wwLC02LjgyNWwxNy4xNDksMGwwLDQ5LjA4MmwtMTcuMTQ5LDBsMCwtNi44MjVjLTIuNTM3LDQuMzc2IC03LjUyMyw3LjQzNyAtMTQuNDMzLDcuNDM3Yy0xMS42MzYsMCAtMjAuOTExLC05LjUzNyAtMjAuOTExLC0yNS4xOTdjMCwtMTUuNjYgOS4yNzQsLTI1LjEwOSAyMC45MTEsLTI1LjEwOSIgc3R5bGU9ImZpbGw6I2ZmZjtmaWxsLXJ1bGU6bm9uemVybzsiLz48L2c+PGc+PHBhdGggZD0iTTEwNy4zMzEsNi41NjFsMTcuMTQ4LDBsMCwyMi42NmMyLjg4OSwtNC4xOTkgOC4wNSwtNy40MzcgMTUuMTM1LC03LjQzN2MxMS4xOTksMCAxOC4yODYsOC4wNSAxOC4yODYsMjAuOTExbDAsMjguNjA4bC0xNy4xNDcsMGwwLC0yNi4zMzRjMCwtNS42ODggLTMuMTUxLC05LjAxMiAtOC4wNSwtOS4wMTJjLTUuMDc2LDAgLTguMjI1LDMuMzI0IC04LjIyNSw5LjAxMmwwLDI2LjMzNGwtMTcuMTQ3LDBsMCwtNjQuNzQyWiIgc3R5bGU9ImZpbGw6I2ZmZjtmaWxsLXJ1bGU6bm9uemVybzsiLz48L2c+PGc+PHBhdGggZD0iTTE3Ny4yMjcsNDEuOTA3bDE1LjEzNSwwYzAsLTQuMzc0IC0zLjQxMiwtNi43MzggLTcuMzQ4LC02LjczOGMtNC4xMTEsMCAtNywyLjI3NiAtNy43ODcsNi43MzhtNy44NzUsMzAuMDA4Yy0xNC41MjMsMCAtMjQuOTM0LC05LjUzNyAtMjQuOTM0LC0yNS4xOTdjMCwtMTUuNTczIDEwLjIzNywtMjUuMTA3IDI0LjkzNCwtMjUuMTA3YzE0LjUyMywwIDI0Ljc2LDkuMzYgMjQuNzYsMjQuNTgzYzAsMS4zMTIgLTAuMDg3LDIuNzE0IC0wLjI2Miw0LjAyNmwtMzIuNDU5LDBjMC4zNSw1LjY4NiAzLjQxMiw3Ljk2IDcuMjYyLDcuOTZjMy4zMjQsMCA1LjE2MSwtMS44MzcgNi4xMjMsLTMuODQ5bDE4LjI4NiwwYy0yLjI3NiwxMC4wNjIgLTExLjQ2MSwxNy41ODUgLTIzLjcxLDE3LjU4NSIgc3R5bGU9ImZpbGw6I2ZmZjtmaWxsLXJ1bGU6bm9uemVybzsiLz48L2c+PGc+PHJlY3QgeD0iMjEyLjQ3OCIgeT0iNi41NjEiIHdpZHRoPSIxNy4xNDkiIGhlaWdodD0iNjQuNzQyIiBzdHlsZT0iZmlsbDojZmZmOyIvPjwvZz48Zz48cGF0aCBkPSJNMjUzLjk2OCw3MS45MTVjLTEzLjY0OCwwIC0yMi43NDgsLTcuMzUgLTIzLjQ0NywtMTcuMTQ3bDE2LjYyMiwwYzAuNDM5LDMuMjM3IDMuMTUxLDQuOTg2IDYuNzM4LDQuOTg2YzIuODg3LDAgNC41NDksLTEuNCA0LjU0OSwtMy4xNDljMCwtNy4xNzUgLTI2LjA3MiwtMS4zMTIgLTI2LjA3MiwtMTkuMzM2YzAsLTguNTczIDcuMDg3LC0xNS42NiAyMC4zODYsLTE1LjY2YzEzLjM4NiwwIDIwLjM4NCw3LjQzNyAyMS41MjEsMTcuMTQ3bC0xNS40ODUsMGMtMC41MjUsLTMuMDYyIC0yLjcxMiwtNC44OTkgLTYuMzg2LC00Ljg5OWMtMi43OTksMCAtNC4yODYsMS4xMzcgLTQuMjg2LDIuOTc2YzAsNi45OTggMjYuMTU3LDEuNCAyNi4yNDUsMjAuMDM0YzAsOC41NzUgLTcuNjk4LDE1LjA0OCAtMjAuMzg0LDE1LjA0OCIgc3R5bGU9ImZpbGw6I2ZmZjtmaWxsLXJ1bGU6bm9uemVybzsiLz48L2c+PGc+PHBhdGggZD0iTTI4MS4wODMsMzYuNDgybC02LjAzOCwwbDAsLTE0LjI2bDYuMDM4LDBsMCwtMTEuODk5bDE3LjIzNSwwbDAsMTEuODk5bDguOTI0LDBsMCwxNC4yNmwtOC45MjQsMGwwLDE2LjQ0N2MwLDIuNjI0IDEuMTM3LDMuNzYzIDQuMDI0LDMuNzYzbDQuOTg4LDBsMCwxNC42MWwtNy40MzcsMGMtMTAuODQ5LDAgLTE4LjgwOSwtNC41NTEgLTE4LjgwOSwtMTguNjM2bDAsLTE2LjE4NWwtMC4wMDEsMC4wMDFaIiBzdHlsZT0iZmlsbDojZmZmO2ZpbGwtcnVsZTpub256ZXJvOyIvPjwvZz48Zz48cGF0aCBkPSJNMzYxLjA0Miw3MS4zMDNsLTE3LjIzNSwwbDAsLTdjLTIuODAxLDQuMjAxIC03Ljk2Miw3LjQzNyAtMTQuODczLDcuNDM3Yy0xMS4zNzQsMCAtMTguNDYxLC04LjA1IC0xOC40NjEsLTIwLjk5NmwwLC0yOC41MjFsMTcuMDYyLDBsMCwyNi4zMzJjMCw1LjY4OCAzLjIzNyw5LjAxMiA4LjEzNSw5LjAxMmM0Ljk4OCwwIDguMTM3LC0zLjMyNCA4LjEzNywtOS4wMTJsMCwtMjYuMzMybDE3LjIzNSwwbDAsNDkuMDhaIiBzdHlsZT0iZmlsbDojZmZmO2ZpbGwtcnVsZTpub256ZXJvOyIvPjwvZz48Zz48cGF0aCBkPSJNMzkwLjA4LDM2LjU3Yy00Ljg5OSwwIC04LjkyNCwzLjQ5OSAtOC45MjQsMTAuMTQ5YzAsNi41NjEgNC4wMjYsMTAuMjM1IDguOTI0LDEwLjIzNWM0LjgxMSwwIDguOTIyLC0zLjU4NiA4LjkyMiwtMTAuMjM1YzAsLTYuNTYzIC00LjExMSwtMTAuMTQ5IC04LjkyMiwtMTAuMTQ5bS01LjQyNSwtMTQuOTZjNi40NzMsMCAxMS41NDksMi44ODcgMTQuMjYsNy4zNDhsMCwtMjIuMzk2bDE3LjIzNSwwbDAsNjQuNzQybC0xNy4yMzUsMGwwLC02LjgyNWMtMi41MzcsNC4zNzYgLTcuNDM1LDcuNDM3IC0xNC4zNDYsNy40MzdjLTExLjYzNiwwIC0yMC45MTEsLTkuNTM3IC0yMC45MTEsLTI1LjE5N2MwLC0xNS42NiA5LjI3NCwtMjUuMTA5IDIwLjk5NiwtMjUuMTA5IiBzdHlsZT0iZmlsbDojZmZmO2ZpbGwtcnVsZTpub256ZXJvOyIvPjwvZz48Zz48cGF0aCBkPSJNNDIxLjU2OCwyMi4yMjNsMTcuMTQ3LDBsMCw0OS4wOGwtMTcuMTQ3LDBsMCwtNDkuMDhabS0xLjQsLTEzLjI5OGMwLC00Ljk4OCAzLjkzNiwtOC45MjQgMTAuMDYsLTguOTI0YzYuMDM2LDAgOS45NzQsMy45MzYgOS45NzQsOC45MjRjMCw0Ljg5OSAtMy45MzgsOC43NDggLTkuOTc0LDguNzQ4Yy02LjEyMywwIC0xMC4wNiwtMy44NDkgLTEwLjA2LC04Ljc0OCIgc3R5bGU9ImZpbGw6I2ZmZjtmaWxsLXJ1bGU6bm9uemVybzsiLz48L2c+PGc+PHBhdGggZD0iTTQ2Ni45NzEsNTcuMDQyYzQuMzc0LDAgOC40LC0zLjIzNyA4LjQsLTEwLjMyNGMwLC02Ljk5OCAtMy45MzgsLTEwLjIzNyAtOC4zMTIsLTEwLjIzN2MtNC4zNzYsMCAtOC4yMjUsMy4yMzkgLTguMjI1LDEwLjIzN2MwLDcuMDg3IDMuNjc0LDEwLjMyNCA4LjEzNywxMC4zMjRtMCwxNC44NzNjLTE0LjYxMiwwIC0yNS42MzYsLTkuNTM3IC0yNS42MzYsLTI1LjE5N2MwLC0xNS41NzMgMTEuMTExLC0yNS4xMDkgMjUuNzI0LC0yNS4xMDljMTQuNjEsMCAyNS43Miw5LjUzNyAyNS43MiwyNS4xMDljMCwxNS42NiAtMTEuMTk3LDI1LjE5NyAtMjUuODA3LDI1LjE5NyIgc3R5bGU9ImZpbGw6I2ZmZjtmaWxsLXJ1bGU6bm9uemVybzsiLz48L2c+PC9nPjwvc3ZnPg==";

export function generateTransactionalPreviewHtml(template: TransactionalEmailTemplate): string {
  const { heading, message, actionLabel, action, fields, preheader, subject } = template;

  const ctaHref = action && action.startsWith("http") ? action : "#preview";
  const ctaLabel = actionLabel ?? "Get Started";

  const fieldsHtml = fields.length > 0
    ? `<div style="margin-top:28px;">
        <p style="margin:0 0 10px;font-size:11px;font-weight:600;color:#A8A69E;text-transform:uppercase;letter-spacing:0.08em;">Template variables</p>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${fields.map((f) => `<span style="display:inline-block;background:#F5F3EF;border:1px solid #E4E2DC;border-radius:6px;padding:4px 10px;font-size:12px;font-family:'Courier New',Courier,monospace;color:#6B6860;">&#123;&#123;&nbsp;${f}&nbsp;&#125;&#125;</span>`).join("")}
        </div>
      </div>`
    : "";

  const ctaHtml = actionLabel
    ? `<a href="${ctaHref}" style="display:inline-block;background-color:#FF5300;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:50px;font-weight:700;font-size:16px;margin-top:32px;">${ctaLabel}</a>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
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
        <tr><td style="padding:48px 48px 40px;">
          <h1 style="margin:0 0 16px;font-size:26px;font-weight:600;color:#1A1916;line-height:1.3;">${heading}</h1>
          <p style="margin:0;font-size:16px;line-height:1.7;color:#6B6860;">${message}</p>
          ${ctaHtml}
          ${fieldsHtml}
        </td></tr>
        <tr><td style="padding:24px 48px 36px;border-top:1px solid #E4E2DC;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#A8A69E;">&copy; 2026 Kahel Studio. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.replace(LOGO_URL, LOGO_DATA_URI);
}
