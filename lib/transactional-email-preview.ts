import type { TransactionalEmailTemplate } from "@/lib/transactional-emails";
import { KAHEL_LOGO_URL } from "@/lib/email-preview-utils";

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fieldPill(name: string): string {
  return `<span style="display:inline-block;background:#F5F3EF;border:1px solid #E4E2DC;border-radius:6px;padding:3px 10px;font-size:12px;font-family:'Courier New',Courier,monospace;color:#6B6860;white-space:nowrap;">&#123;&#123;&nbsp;${esc(name)}&nbsp;&#125;&#125;</span>`;
}

export function generateTransactionalPreviewHtml(template: TransactionalEmailTemplate): string {
  const { heading, message, actionLabel, action, fields, preheader, subject } = template;

  const ctaHref = action && action.startsWith("http") ? esc(action) : "#preview";
  const ctaHtml = actionLabel
    ? `<a href="${ctaHref}" style="display:inline-block;background-color:#FF5300;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:50px;font-weight:700;font-size:16px;margin-top:32px;">${esc(actionLabel)}</a>`
    : "";

  const fieldsHtml = fields.length > 0
    ? `<div style="margin-top:32px;padding:20px;background:#F5F3EF;border-radius:10px;">
        <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#A8A69E;text-transform:uppercase;letter-spacing:0.08em;">Template variables</p>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">${fields.map(fieldPill).join("")}</div>
        <p style="margin:10px 0 0;font-size:11px;color:#A8A69E;">Replace these placeholders with rendered values before sending.</p>
      </div>`
    : "";

  const reviewBanner = `<div style="margin-bottom:28px;padding:12px 16px;background:#FFF8F5;border:1px solid #FFCFB3;border-radius:8px;">
    <p style="margin:0;font-size:12px;color:#C44200;font-weight:600;">Draft — review copy and field placement before publishing</p>
  </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#ECEAE4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#ECEAE4;opacity:0;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ECEAE4;padding:48px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;width:600px;max-width:100%;">
        <tr><td style="background-color:#1A1916;padding:32px 48px;">
          <img src="${KAHEL_LOGO_URL}" width="200" height="29" alt="Kahel Studio" style="display:block;border:0;outline:none;text-decoration:none;">
          <p style="margin:12px 0 0 0;font-size:13px;color:#B7B2A8;">Creating Visual Experiences</p>
        </td></tr>
        <tr><td style="height:4px;background-color:#FF5300;"></td></tr>
        <tr><td style="padding:48px 48px 40px;">
          ${reviewBanner}
          <h1 style="margin:0 0 16px;font-size:26px;font-weight:600;color:#1A1916;line-height:1.3;">${esc(heading)}</h1>
          <p style="margin:0;font-size:16px;line-height:1.7;color:#6B6860;">${esc(message)}</p>
          ${ctaHtml}
          ${fieldsHtml}
        </td></tr>
        <tr><td style="padding:24px 48px 36px;border-top:1px solid #E4E2DC;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#A8A69E;">&copy; 2026 Kahel Studio. All rights reserved.</p>
          <p style="margin:4px 0 0;font-size:12px;color:#A8A69E;">This is not an official receipt.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function generateTransactionalPlainText(template: TransactionalEmailTemplate): string {
  const { heading, message, actionLabel, action, fields, subject } = template;
  const lines: string[] = [
    subject,
    "",
    heading,
    "",
    message,
  ];
  if (actionLabel && action) {
    lines.push("", `${actionLabel}:`, action.startsWith("http") ? action : `{{ ${action} }}`);
  }
  if (fields.length > 0) {
    lines.push("", "---", "Template variables: " + fields.map((f) => `{{ ${f} }}`).join(", "));
  }
  lines.push("", "---", "© 2026 Kahel Studio. All rights reserved.", "This is not an official receipt.");
  return lines.join("\n");
}
