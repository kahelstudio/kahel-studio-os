"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/components/toast/toast-provider";

export type EquipmentValues = {
  id: string;
  idTag: string;
  serial: string;
  name: string;
  category: string;
  status: string;
  location: string | null;
  note: string | null;
};

const STATUSES = ["available", "out", "maint"];

export function EquipmentRowActions({ values, label }: { values: EquipmentValues; label: string }) {
  const router = useRouter();
  const { fireToast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  function remove() {
    setMenuOpen(false);
    if (!confirm(`Delete "${label}"? This cannot be undone.`)) return;
    setError("");
    startTransition(async () => {
      try {
        const response = await fetch(`/api/operations/equipment?id=${encodeURIComponent(values.id)}`, { method: "DELETE" });
        const result = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) throw new Error(result.error ?? "Unable to delete this item.");
        fireToast("Equipment deleted.", "success");
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to delete this item.");
      }
    });
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form));
    setError("");
    startTransition(async () => {
      try {
        const response = await fetch("/api/operations/equipment", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: values.id, ...body }),
        });
        const result = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) throw new Error(result.error ?? "Unable to save this item.");
        setEditOpen(false);
        form.reset();
        fireToast("Equipment updated.", "success");
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to save this item.");
      }
    });
  }

  return (
    <div className="flex justify-end" ref={menuRef}>
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="Equipment actions"
          className="grid h-8 w-8 place-items-center rounded-control text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 z-10 mt-1 w-40 overflow-hidden rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-[var(--shadow-dialog)]"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => { setMenuOpen(false); setEditOpen(true); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-muted)]"
            >
              <Pencil className="h-4 w-4" /> Edit
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={remove}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--color-danger-text)] hover:bg-[var(--color-danger-bg)]"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        ) : null}
      </div>

      <dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        className="m-auto w-[calc(100%-1rem)] max-w-md rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-[var(--color-text-primary)] shadow-[var(--shadow-dialog)] backdrop:bg-black/45"
      >
        <form onSubmit={save} className="grid gap-4">
          <h2 className="font-display text-lg font-semibold">Edit equipment</h2>
          <label className="grid gap-1.5 text-sm font-semibold">
            <span>ID tag</span>
            <input name="id_tag" defaultValue={values.idTag} required maxLength={64} className="min-h-11 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 font-normal" />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            <span>Equipment serial</span>
            <input name="serial" defaultValue={values.serial} required maxLength={64} className="min-h-11 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 font-normal" />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            <span>Equipment name</span>
            <input name="name" defaultValue={values.name} required maxLength={255} className="min-h-11 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 font-normal" />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            <span>Category</span>
            <input name="category" defaultValue={values.category} required maxLength={64} className="min-h-11 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 font-normal" />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            <span>Status</span>
            <select name="status" defaultValue={values.status} className="min-h-11 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 font-normal">
              {STATUSES.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            <span>Location</span>
            <input name="location" defaultValue={values.location ?? ""} maxLength={255} className="min-h-11 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 font-normal" />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            <span>Note</span>
            <textarea name="note" defaultValue={values.note ?? ""} rows={3} maxLength={1000} className="rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 font-normal" />
          </label>
          {error ? <p className="rounded-control bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger-text)]" role="alert">{error}</p> : null}
          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setEditOpen(false)} disabled={pending} className="min-h-11 rounded-control border border-[var(--color-border)] px-4 text-sm font-semibold disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={pending} className="min-h-11 rounded-control bg-[var(--color-kahel-500)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)] disabled:opacity-60">{pending ? "Saving..." : "Save changes"}</button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
