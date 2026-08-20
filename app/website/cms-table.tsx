"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, Check, X, Globe, FileText } from "lucide-react";
import { createContent, updateContent, setContentStatus, deleteContent } from "./actions";

type Table = "website_posts" | "website_collections" | "website_services" | "website_pages";

const STATUS = {
  published: { bg: "var(--color-success-bg)", c: "var(--color-success-text)", label: "Published" },
  draft: { bg: "var(--color-surface-muted)", c: "var(--color-text-secondary)", label: "Draft" },
};

type Row = { id: string; slug: string; title: string; status: string; publishedAt: string | null; updatedAt: string; subtitle?: string | null };

export function CmsTable({ table, rows, slugPrefix = "" }: { table: Table; rows: Row[]; slugPrefix?: string }) {
  const [, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  function fmt(iso: string) {
    return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
  }

  async function handleCreate() {
    if (!newTitle.trim()) return;
    setBusy("create");
    try {
      await createContent(table, newTitle);
      setNewTitle("");
      setCreating(false);
    } finally { setBusy(null); }
  }

  async function handleSaveEdit(id: string) {
    setBusy(id + "-edit");
    try {
      await updateContent(table, id, { title: editTitle.trim(), slug: editSlug.trim() });
      setEditingId(null);
    } finally { setBusy(null); }
  }

  async function handleToggleStatus(id: string, current: string) {
    setBusy(id + "-status");
    try {
      await setContentStatus(table, id, current === "published" ? "draft" : "published");
    } finally { setBusy(null); }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setBusy(id + "-delete");
    try {
      startTransition(async () => { await deleteContent(table, id); });
    } finally { setBusy(null); }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        {creating ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") { setCreating(false); setNewTitle(""); } }}
              placeholder="Title…"
              className="h-9 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm focus:border-[var(--color-kahel-500)] focus:outline-none"
            />
            <button onClick={handleCreate} disabled={busy === "create" || !newTitle.trim()} className="flex h-9 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-3 text-sm font-semibold text-white disabled:opacity-50 hover:bg-[var(--color-kahel-600)]">
              <Check className="h-3.5 w-3.5" /> Save
            </button>
            <button onClick={() => { setCreating(false); setNewTitle(""); }} className="flex h-9 items-center gap-1 rounded-control border border-[var(--color-border)] px-3 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button onClick={() => setCreating(true)} className="flex h-9 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
            + New
          </button>
        )}
      </div>

      {rows.length === 0 && !creating ? (
        <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] py-16 text-center text-sm text-[var(--color-text-muted)]">
          No content yet — create your first entry above.
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
          {rows.map((row) => {
            const st = STATUS[row.status as keyof typeof STATUS] ?? STATUS.draft;
            const isEditing = editingId === row.id;
            return (
              <div key={row.id} className="flex items-center gap-3 border-b border-[var(--color-border)] px-5 py-3.5 last:border-b-0">
                {isEditing ? (
                  <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                    <input
                      autoFocus
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Title"
                      className="h-8 flex-1 rounded border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2.5 text-sm focus:outline-none focus:border-[var(--color-kahel-500)]"
                    />
                    <input
                      value={editSlug}
                      onChange={(e) => setEditSlug(e.target.value)}
                      placeholder="slug"
                      className="h-8 w-[180px] rounded border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2.5 font-mono text-xs focus:outline-none focus:border-[var(--color-kahel-500)]"
                    />
                    <div className="flex gap-1.5">
                      <button onClick={() => handleSaveEdit(row.id)} disabled={busy === row.id + "-edit"} className="flex h-8 items-center gap-1 rounded bg-[var(--color-kahel-500)] px-3 text-xs font-semibold text-white disabled:opacity-50">
                        <Check className="h-3 w-3" /> Save
                      </button>
                      <button onClick={() => setEditingId(null)} className="flex h-8 items-center rounded border border-[var(--color-border)] px-2.5 text-xs text-[var(--color-text-secondary)]">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-sm">{row.title}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
                        {slugPrefix && <span className="flex items-center gap-0.5"><Globe className="h-3 w-3" />{slugPrefix}{row.slug}</span>}
                        {row.subtitle && <span>{row.subtitle}</span>}
                        <span>Updated {fmt(row.updatedAt)}</span>
                      </div>
                    </div>
                    <span className="rounded-pill px-2.5 py-1 text-[11px] font-semibold" style={{ background: st.bg, color: st.c }}>{st.label}</span>
                    <button
                      onClick={() => handleToggleStatus(row.id, row.status)}
                      disabled={busy === row.id + "-status"}
                      title={row.status === "published" ? "Unpublish" : "Publish"}
                      className="flex h-8 items-center gap-1 rounded border border-[var(--color-border)] px-2.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] disabled:opacity-40"
                    >
                      <FileText className="h-3 w-3" />
                      {row.status === "published" ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      onClick={() => { setEditingId(row.id); setEditTitle(row.title); setEditSlug(row.slug); }}
                      title="Edit"
                      className="flex h-8 w-8 items-center justify-center rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(row.id, row.title)}
                      disabled={busy === row.id + "-delete"}
                      title="Delete"
                      className="flex h-8 w-8 items-center justify-center rounded border border-[var(--color-border)] text-[var(--color-danger-text)] hover:bg-[var(--color-danger-bg)] disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
