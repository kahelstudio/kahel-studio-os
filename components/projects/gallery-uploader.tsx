"use client";

import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, RotateCcw, UploadCloud } from "lucide-react";

type UploadItem = {
  key: string;
  file: File;
  progress: number;
  status: "queued" | "uploading" | "processing" | "failed";
  error?: string;
  resumable?: boolean;
};

export function GalleryUploader({ galleryId, onComplete, disabled }: { galleryId: string; onComplete: () => void; disabled?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploadItem[]>([]);

  function patch(key: string, update: Partial<UploadItem>) {
    setItems((current) => current.map((item) => item.key === key ? { ...item, ...update } : item));
  }

  async function upload(item: UploadItem) {
    patch(item.key, { status: "uploading", progress: 0, error: undefined });
    try {
      const sessionResponse = await fetch("/api/media/uploads/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ galleryId, filename: item.file.name, contentType: item.file.type || "application/octet-stream", byteSize: item.file.size }),
      });
      const session = await sessionResponse.json() as { sessionId?: string; completionToken?: string; uploadUrl?: string; headers?: Record<string, string>; resumable?: boolean; supportsResume?: boolean; error?: string };
      if (!sessionResponse.ok || !session.sessionId || !session.completionToken || !session.uploadUrl) throw new Error(session.error ?? "Could not create an upload session.");
      patch(item.key, { resumable: session.resumable === true || session.supportsResume === true });
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", session.uploadUrl as string);
        for (const [name, value] of Object.entries(session.headers ?? {})) xhr.setRequestHeader(name, value);
        if (!(session.headers && Object.keys(session.headers).some((name) => name.toLowerCase() === "content-type"))) xhr.setRequestHeader("Content-Type", item.file.type || "application/octet-stream");
        xhr.upload.onprogress = (event) => event.lengthComputable && patch(item.key, { progress: Math.round((event.loaded / event.total) * 100) });
        xhr.onerror = () => reject(new Error("The browser upload was interrupted."));
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status}).`));
        xhr.send(item.file);
      });
      patch(item.key, { status: "processing", progress: 100 });
      const completeResponse = await fetch(`/api/media/uploads/${encodeURIComponent(session.sessionId)}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ galleryId, completionToken: session.completionToken }),
      });
      const completed = await completeResponse.json().catch(() => ({})) as { error?: string };
      if (!completeResponse.ok) throw new Error(completed.error ?? "Upload completion failed.");
      onComplete();
    } catch (error) {
      patch(item.key, { status: "failed", error: error instanceof Error ? error.message : "Upload failed." });
    }
  }

  function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const next = Array.from(files).map((file) => ({ key: crypto.randomUUID(), file, progress: 0, status: "queued" as const }));
    setItems((current) => [...next, ...current]);
    for (const item of next) void upload(item);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <section className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold">Upload files</h3>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">Files upload directly to media storage, then appear here while processing.</p>
        </div>
        <input ref={inputRef} type="file" multiple className="sr-only" onChange={(event) => addFiles(event.target.files)} disabled={disabled} />
        <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-[var(--color-kahel-500)] px-4 text-sm font-semibold text-white disabled:opacity-50">
          <UploadCloud className="h-4 w-4" /> Choose files
        </button>
      </div>
      {items.length > 0 && <div className="mt-4 space-y-2 border-t border-[var(--color-border)] pt-4">
        {items.map((item) => <div key={item.key} className="rounded-control bg-[var(--color-canvas)] p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{item.file.name}</div>
              <div className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                {item.status === "processing" ? "Uploaded, processing" : item.status === "failed" ? item.error : `${item.progress}% uploaded`}
              </div>
              {item.resumable !== undefined && <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">{item.resumable ? "Resumable upload supported by storage" : "This upload is not resumable; retry starts again"}</div>}
            </div>
            {item.status === "failed" ? <button type="button" onClick={() => void upload(item)} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-control px-3 text-xs font-semibold text-[var(--color-kahel-700)]"><RotateCcw className="h-4 w-4" /> Retry</button> : item.status === "processing" ? <CheckCircle2 className="mt-1 h-4 w-4 text-[var(--color-success)]" /> : <AlertCircle className="mt-1 h-4 w-4 text-[var(--color-text-muted)]" />}
          </div>
          {item.status === "uploading" && <div className="mt-2 h-1.5 overflow-hidden rounded-pill bg-[var(--color-surface-muted)]"><div className="h-full bg-[var(--color-kahel-500)]" style={{ width: `${item.progress}%` }} /></div>}
        </div>)}
      </div>}
    </section>
  );
}
