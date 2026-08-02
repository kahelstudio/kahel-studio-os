# Kahel Studio Supabase Auth email templates

These files are paste-ready bodies for Supabase Auth. The HTML uses table layout, inline styles, a 16px body font, and a solid `#FF5300` call to action. It deliberately has no gradients, scripts, forms, remote images, or token displayed separately from its secure action URL.

## Template map

| Supabase template | Subject | HTML | Plain text |
| --- | --- | --- | --- |
| Invite user | `Set up your Kahel Studio account` | `invite.html` | `invite.txt` |
| Reset password | `Reset your Kahel Studio password` | `recovery.html` | `recovery.txt` |
| Password changed | `Your Kahel Studio password was changed` | `password-changed.html` | `password-changed.txt` |
| New sign-in (optional) | `New sign-in to your Kahel Studio account` | `new-sign-in.html` | `new-sign-in.txt` |

Supabase Dashboard's hosted email editor accepts the HTML body. Keep the matching `.txt` body in the transactional-email provider if it supports a multipart alternative or use it as the canonical plain-text fallback when sending through a custom hook. Do not append `{{ .TokenHash }}` as visible copy, logging metadata, analytics data, or a separate code.

`password-changed` and `new-sign-in` are provider/config security-notification templates, not verification flows. Enable **Password changed** in Supabase Auth security notifications and paste its body where the project plan exposes that template. Enable and install **New sign-in** only if the Supabase plan/provider supports new-device or sign-in notifications; otherwise configure it in the external transactional provider or an Auth Send Email Hook. Neither notification should contain a token.

## Callback contract

The invite and recovery links intentionally send the secret only inside the URL:

```text
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery
```

`/auth/callback` is a server-side handler that accepts only `type=invite` or `type=recovery`, calls Supabase `verifyOtp({ token_hash, type })`, establishes the resulting session using secure, HTTP-only cookies, and redirects to `/set-password`. It never logs the request URL, query string, token hash, session, or credential-bearing provider errors.

The callback preserves the verified recovery session for `/set-password`. Do not put a token in HTML copy, a query parameter on the post-verification redirect, browser storage, analytics, support messages, or screenshots. HTTPS is mandatory outside local development.

## Supabase Dashboard setup

Configure local, staging, and production separately. Staging and production use separate Supabase projects.

| Environment | Auth Site URL | Redirect URL allowlist entries |
| --- | --- | --- |
| Local Supabase | `http://localhost:3000` | `http://localhost:3000/auth/callback` |
| Staging project | `https://kahel.studio` | `https://kahel.studio/auth/callback` |
| Production project | `https://kahelstudio.com` | `https://kahelstudio.com/auth/callback` |

1. Open the target project in Supabase Dashboard.
2. Go to **Authentication > URL Configuration**.
3. Set **Site URL** to the exact value in the table. Do not include a trailing slash.
4. Under **Redirect URLs**, add only the two exact URLs for that environment. Do not use `*`, preview-domain wildcards, the other environment's domain, or an HTTP production URL.
5. Go to **Authentication > Email Templates**.
6. Select **Invite user**, set the subject from the template map, and paste `invite.html` as the body.
7. Select **Reset password**, set the subject from the template map, and paste `recovery.html` as the body.
8. Under security notifications, enable **Password changed**, set its subject, and paste `password-changed.html` if the control is available. Configure the same HTML/text pair in the email provider or Send Email Hook when Supabase does not expose the body editor.
9. Optionally enable/configure the new-sign-in notification with `new-sign-in.html` and `new-sign-in.txt` only where the selected provider supports it.
10. Configure a verified custom SMTP sender for each hosted project. Use a Kahel Studio-owned From address and configure SPF, DKIM, and DMARC for its domain.
11. Send one invite and one recovery message in each environment. Confirm the host is correct, the callback consumes the link once, an expired/reused link fails safely, the password can be set, and no token appears in logs, analytics, or the post-callback URL.

The stated 24-hour invite and 1-hour recovery expiry text must match each project's actual Auth token lifetime. If project policy differs, change the wording before publishing rather than promising an incorrect lifetime.
