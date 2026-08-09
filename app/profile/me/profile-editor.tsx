"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, X } from "lucide-react";

type ProfileEditorProps = {
  displayName: string;
  email: string;
  initials: string;
  avatarUrl: string | null;
};

export function ProfileEditor({ displayName, email, initials, avatarUrl }: ProfileEditorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(displayName);
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(avatarUrl);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape" && !submitting) setOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, submitting]);

  useEffect(() => () => { if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  function showEditor() {
    setName(displayName);
    setPhoto(null);
    setPreviewUrl(avatarUrl);
    setError("");
    setOpen(true);
  }

  function choosePhoto(file: File | undefined) {
    if (!file) return;
    if (!(["image/jpeg", "image/png", "image/webp"].includes(file.type)) || file.size > 3 * 1024 * 1024) {
      setError("Choose a JPEG, PNG, or WebP image smaller than 3 MB.");
      return;
    }
    setError("");
    setPhoto(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const profileResponse = await fetch("/api/staff/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName: name }) });
      const profileResult = await profileResponse.json() as { error?: string };
      if (!profileResponse.ok) throw new Error(profileResult.error ?? "Unable to update your profile.");

      if (photo) {
        const form = new FormData();
        form.set("photo", photo);
        const photoResponse = await fetch("/api/staff/profile/photo", { method: "POST", body: form });
        const photoResult = await photoResponse.json() as { error?: string };
        if (!photoResponse.ok) throw new Error(photoResult.error ?? "Unable to update your profile photo.");
      }

      setOpen(false);
      router.refresh();
      window.dispatchEvent(new Event("staff-profile-updated"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update your profile.");
    } finally {
      setSubmitting(false);
    }
  }

  return <><button type="button" onClick={showEditor} className="ml-auto flex h-10 shrink-0 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">Edit profile</button>{open && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) setOpen(false); }}><form onSubmit={save} className="max-h-[calc(100dvh-1rem)] w-full overflow-y-auto rounded-t-card border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-dialog)] sm:max-w-md sm:rounded-card"><div className="flex items-start gap-4 border-b border-[var(--color-border)] p-5"><div><h2 id="edit-profile-title" className="font-display text-xl font-semibold">Edit profile</h2><p className="mt-1 text-sm text-[var(--color-text-secondary)]">Update your photo and display name.</p></div><button type="button" onClick={() => setOpen(false)} disabled={submitting} className="ml-auto grid min-h-11 min-w-11 place-items-center rounded-control text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]" aria-label="Close dialog"><X className="h-4 w-4" /></button></div><div className="space-y-4 p-5"><div className="flex items-center gap-4"><div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[16px] bg-cover bg-center bg-[var(--color-indigo-100)] font-display text-2xl font-semibold text-[var(--color-indigo-800)]" style={previewUrl ? { backgroundImage: `url(${previewUrl})` } : undefined}>{!previewUrl && initials}</div><label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-control border border-[var(--color-border)] px-4 text-sm font-semibold hover:bg-[var(--color-surface-muted)]"><Camera className="h-4 w-4" />Change photo<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => choosePhoto(event.target.files?.[0])} /></label></div><p className="text-xs text-[var(--color-text-muted)]">JPEG, PNG, or WebP. Maximum 3 MB.</p><label className="block text-sm font-semibold">Display name<input autoFocus required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 font-normal outline-none focus:border-[var(--color-kahel-500)]" /></label><label className="block text-sm font-semibold">Email<input disabled value={email} className="mt-1.5 min-h-11 w-full cursor-not-allowed rounded-control border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 font-normal text-[var(--color-text-muted)]" /></label>{error && <p className="text-sm font-medium text-[var(--color-danger-text)]" role="alert">{error}</p>}</div><div className="flex gap-3 border-t border-[var(--color-border)] p-5"><button type="button" onClick={() => setOpen(false)} disabled={submitting} className="min-h-11 flex-1 rounded-control border border-[var(--color-border)] text-sm font-semibold hover:bg-[var(--color-surface-muted)] disabled:opacity-55">Cancel</button><button disabled={submitting || name.trim().length < 2} className="min-h-11 flex-1 rounded-control bg-[var(--color-kahel-500)] text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)] disabled:opacity-55">{submitting ? "Saving..." : "Save changes"}</button></div></form></div>}</>;
}
