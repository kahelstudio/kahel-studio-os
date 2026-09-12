"use client";

import { useState } from "react";
import { AUTH_EMAIL_TEMPLATES, resolveAuthTemplateHtml } from "@/lib/auth-email-templates";
import { prepareEmailForPreview } from "@/lib/email-preview-utils";

const TEST_RECIPIENTS = [
  "eusebio.barrun@gmail.com",
  "joanne.kahelstudio@gmail.com",
  "luiz.kahelstudio@gmail.com",
];

export function AuthEmailTemplatesPanel({ canManage }: { canManage: boolean }) {
  const [selectedKey, setSelectedKey] = useState(AUTH_EMAIL_TEMPLATES[0].key);
  const [sendOpen, setSendOpen] = useState(false);

  const selected = AUTH_EMAIL_TEMPLATES.find((t) => t.key === selectedKey) ?? AUTH_EMAIL_TEMPLATES[0];
  const previewHtml = prepareEmailForPreview(resolveAuthTemplateHtml(selected));

  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside
        className="max-h-[70dvh] overflow-y-auto rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-2"
        aria-label="Auth email templates"
      >
        {AUTH_EMAIL_TEMPLATES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setSelectedKey(t.key)}
            className={`mb-1 min-h-11 w-full rounded-control p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-kahel-500)] ${
              selected.key === t.key
                ? "bg-[var(--color-kahel-50)] text-[var(--color-kahel-700)]"
                : "hover:bg-[var(--color-canvas)]"
            }`}
          >
            <span className="block text-sm font-semibold">{t.name}</span>
            <span className="mt-1 block text-xs text-[var(--color-text-muted)]">{t.type}</span>
          </button>
        ))}
      </aside>

      <section className="min-w-0 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.06em] text-[var(--color-text-muted)]">
              Supabase auth · {selected.type}
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold">{selected.name}</h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{selected.subject}</p>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={() => setSendOpen(true)}
              className="min-h-11 rounded-control bg-[var(--color-text-primary)] px-4 text-sm font-semibold text-[var(--color-surface)]"
            >
              Send test
            </button>
          )}
        </div>

        {selected.previewVars && Object.keys(selected.previewVars).length > 0 && (
          <p className="mt-5 text-xs text-[var(--color-text-muted)]">
            Variables: {Object.keys(selected.previewVars).join(", ")}
          </p>
        )}

        <iframe
          key={selected.key}
          title={`Preview: ${selected.name}`}
          sandbox=""
          srcDoc={previewHtml}
          className="mt-5 h-[520px] w-full rounded-control border border-[var(--color-border)] bg-white"
        />
      </section>

      {sendOpen && (
        <SendTestDialog
          template={selected}
          onClose={() => setSendOpen(false)}
        />
      )}
    </div>
  );
}

function SendTestDialog({
  template,
  onClose,
}: {
  template: (typeof AUTH_EMAIL_TEMPLATES)[number];
  onClose: () => void;
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set([TEST_RECIPIENTS[0]]));
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  function toggle(email: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(email) ? next.delete(email) : next.add(email);
      return next;
    });
  }

  async function send() {
    const recipients = [
      ...checked,
      ...(custom.trim() ? [custom.trim()] : []),
    ];
    if (recipients.length === 0) { setError("Select at least one recipient."); return; }

    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/settings/email-templates/auth-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateKey: template.key, recipients }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null;
        setError(result?.error ?? "Failed to send.");
        setBusy(false);
        return;
      }
      setSent(true);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-test-title"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
    >
      <div className="w-full max-w-md rounded-t-modal bg-[var(--color-surface)] p-5 shadow-[var(--shadow-dialog)] sm:rounded-modal">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="send-test-title" className="font-display text-xl font-semibold">Send test email</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{template.name} — {template.subject}</p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="min-h-11 rounded-control px-3 text-sm font-semibold"
          >
            Close
          </button>
        </div>

        {sent ? (
          <div className="mt-5 rounded-control bg-[var(--color-canvas)] p-4 text-sm text-[var(--color-text-secondary)]">
            Test email sent successfully. Check your inbox.
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <fieldset>
              <legend className="text-sm font-semibold">Recipients</legend>
              <div className="mt-2 space-y-2">
                {TEST_RECIPIENTS.map((email) => (
                  <label key={email} className="flex min-h-10 cursor-pointer items-center gap-3 rounded-control border border-[var(--color-border)] px-3 text-sm">
                    <input
                      type="checkbox"
                      checked={checked.has(email)}
                      onChange={() => toggle(email)}
                      className="h-4 w-4 accent-[var(--color-kahel-500)]"
                    />
                    {email}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="block text-sm font-semibold">
              Additional recipient
              <input
                type="email"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="someone@example.com"
                className="mt-1.5 min-h-11 w-full rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-normal"
              />
            </label>

            {error && <p role="alert" className="text-sm text-[var(--color-danger-text)]">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={busy}
                onClick={onClose}
                className="min-h-11 rounded-control border border-[var(--color-border)] px-4 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={send}
                className="min-h-11 rounded-control bg-[var(--color-text-primary)] px-4 text-sm font-semibold text-[var(--color-surface)] disabled:opacity-40"
              >
                {busy ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
