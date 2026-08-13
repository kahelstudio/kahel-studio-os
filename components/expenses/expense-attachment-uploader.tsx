"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Paperclip, RotateCcw, UploadCloud } from "lucide-react";

type Item = { id: string; file: File; status: "uploading" | "complete" | "failed"; progress: number; error?: string };

export function ExpenseAttachmentUploader({ expenseId, onComplete, disabled }: { expenseId: string; onComplete: () => void; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  function patch(id: string, value: Partial<Item>) { setItems((current) => current.map((item) => item.id === id ? { ...item, ...value } : item)); }
  async function upload(item: Item) {
    patch(item.id, { status: "uploading", progress: 0, error: undefined });
    try {
      const authorization = await fetch("/api/media/uploads/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expenseId, documentType: "receipt", filename: item.file.name, contentType: item.file.type || "application/octet-stream", byteSize: item.file.size }) });
      const session = await authorization.json().catch(() => ({})) as { sessionId?: string; completionToken?: string; uploadUrl?: string; headers?: Record<string, string>; error?: string };
      if (!authorization.ok || !session.sessionId || !session.completionToken || !session.uploadUrl) throw new Error(session.error ?? "Could not authorize the upload.");
      await new Promise<void>((resolve, reject) => { const request = new XMLHttpRequest(); request.open("PUT", session.uploadUrl!); for (const [name, value] of Object.entries(session.headers ?? {})) request.setRequestHeader(name, value); request.upload.onprogress = (event) => event.lengthComputable && patch(item.id, { progress: Math.round(event.loaded / event.total * 100) }); request.onerror = () => reject(new Error("The upload was interrupted.")); request.onload = () => request.status >= 200 && request.status < 300 ? resolve() : reject(new Error(`Upload failed (${request.status}).`)); request.send(item.file); });
      const finalized = await fetch(`/api/media/uploads/${session.sessionId}/complete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expenseId, documentType: "receipt", completionToken: session.completionToken }) });
      const result = await finalized.json().catch(() => ({})) as { error?: string };
      if (!finalized.ok) throw new Error(result.error ?? "Could not finalize the attachment.");
      patch(item.id, { status: "complete", progress: 100 }); onComplete();
    } catch (error) { patch(item.id, { status: "failed", error: error instanceof Error ? error.message : "Upload failed." }); }
  }
  function choose(files: FileList | null) { if (!files?.length) return; const next = Array.from(files).map((file) => ({ id: crypto.randomUUID(), file, status: "uploading" as const, progress: 0 })); setItems((current) => [...next, ...current]); for (const item of next) void upload(item); if (input.current) input.current.value = ""; }
  return <div className="rounded-control border border-dashed border-[var(--color-border-strong)] p-3"><input ref={input} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" disabled={disabled} onChange={(event) => choose(event.target.files)} /><button type="button" disabled={disabled} onClick={() => input.current?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-control border border-[var(--color-border)] px-3 text-sm font-semibold disabled:opacity-50"><UploadCloud className="h-4 w-4" /> Add receipt or proof</button><p className="mt-2 text-xs text-[var(--color-text-muted)]">Private PDF, JPEG, PNG, or WebP. Maximum 10 MB.</p>{items.map((item) => <div key={item.id} className="mt-2 flex items-center gap-2 rounded-control bg-[var(--color-surface-muted)] p-2 text-xs"><Paperclip className="h-4 w-4" /><span className="min-w-0 flex-1 truncate">{item.file.name}</span>{item.status === "complete" ? <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" /> : item.status === "failed" ? <button onClick={() => void upload(item)} aria-label={`Retry ${item.file.name}`} className="inline-flex items-center gap-1 text-[var(--color-danger-text)]"><RotateCcw className="h-4 w-4" /> Retry</button> : <span className="tabular-nums">{item.progress}%</span>}</div>)}</div>;
}
