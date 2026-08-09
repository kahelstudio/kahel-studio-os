"use client";

import { useEffect, useState } from "react";
import { MoreHorizontal, Plus, Save, X } from "lucide-react";
import { POS_CATALOGS, type CatalogItem } from "@/lib/sample-data";
import { useToast } from "@/components/toast/toast-provider";

const inputClass =
  "h-9 w-full rounded-control border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-kahel-500)] focus:ring-2 focus:ring-[var(--color-kahel-100)]";

export function CatalogView({
  catalogKey,
}: {
  catalogKey: keyof typeof POS_CATALOGS;
}) {
  const catalog = POS_CATALOGS[catalogKey];
  const { fireToast } = useToast();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [creatingCode, setCreatingCode] = useState<string | null>(null);
  const [draft, setDraft] = useState<CatalogItem | null>(null);
  const [canManage, setCanManage] = useState(false);
  const hasQty = items.some((item) => item.qty);

  useEffect(() => { fetch(`/api/pos/catalog-items?key=${encodeURIComponent(catalogKey)}`).then(async (response) => await response.json() as { items?: Array<{ code: string; name: string; detail: string | null; price: number; quantity_info: string | null }> }).then((result) => { setItems(result.items?.map((item) => ({ code: item.code, name: item.name, detail: item.detail ?? "", price: `₱${Number(item.price).toLocaleString("en-PH")}`, ...(item.quantity_info ? { qty: item.quantity_info } : {}) })) ?? []); }).catch(() => {}); }, [catalogKey]);
  useEffect(() => { fetch("/api/staff/me").then(async (response) => response.ok ? await response.json() as { role?: string } : null).then((data) => setCanManage(data?.role === "admin" || data?.role === "super_admin")).catch(() => setCanManage(false)); }, []);

  function startEditing(item: CatalogItem) {
    setEditingCode(item.code);
    setDraft({ ...item });
  }

  async function saveEdit() {
    if (!editingCode || !draft || !draft.code.trim() || !draft.name.trim()) return;
    const numericPrice = Number(draft.price.replace(/[^0-9.]/g, ""));
    try {
      const response = await fetch("/api/pos/catalog-items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ catalogKey, catalogTitle: catalog.title, catalogSubtitle: catalog.sub, unitLabel: catalog.unit, originalCode: editingCode, code: draft.code, name: draft.name, detail: draft.detail, price: numericPrice, quantityInfo: draft.qty }) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to save item.");
      setItems((current) => current.map((item) => item.code === editingCode ? { ...draft, code: draft.code.trim(), name: draft.name.trim(), price: `₱${numericPrice.toLocaleString("en-PH")}` } : item));
      setEditingCode(null); setCreatingCode(null); setDraft(null); fireToast("Catalog item saved.", "success");
    } catch (error) { fireToast(error instanceof Error ? error.message : "Unable to save item.", "danger"); }
  }

  function addItem() {
    const item: CatalogItem = {
      code: `NEW-${items.length + 1}`,
      name: "New item",
      detail: "Add item details",
      price: "₱0",
      ...(hasQty ? { qty: "0 available" } : {}),
    };

    setItems([...items, item]);
    setCreatingCode(item.code);
    startEditing(item);
  }

  return (
    <div className="p-5 pt-6 sm:p-10 sm:pt-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-[32px]">
            {catalog.title}
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            {catalog.sub}
          </p>
        </div>
        {canManage ? <button
          onClick={addItem}
          className="flex h-11 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 font-display text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]"
        >
          <Plus className="h-4 w-4" /> New item
        </button> : null}
      </div>

      <div className="overflow-x-auto rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="min-w-[780px]">
          <div className="grid h-11 grid-cols-6 items-center bg-[var(--color-canvas)] px-[18px] text-xs font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
            <div>Code</div>
            <div>Item</div>
            <div>Detail</div>
            <div className="text-left">{catalog.unit}</div>
            <div className="flex h-full items-center justify-start text-left">Price</div>
            <div className="text-left">Actions</div>
          </div>
          {items.map((item) => {
            const isEditing = editingCode === item.code && draft;
            return (
              <div
                key={item.code}
                className="grid min-h-[54px] grid-cols-6 items-center gap-2 border-b border-[var(--color-border)] px-[18px] py-2 text-sm last:border-b-0 hover:bg-[var(--color-canvas)]"
              >
                {isEditing ? (
                  <>
                    <input aria-label="Item code" className={inputClass} value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value })} />
                    <input aria-label="Item name" className={inputClass} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
                    <input aria-label="Item detail" className={inputClass} value={draft.detail} onChange={(event) => setDraft({ ...draft, detail: event.target.value })} />
                    <input aria-label={catalog.unit} className={`${inputClass} text-left`} value={draft.qty ?? ""} onChange={(event) => setDraft({ ...draft, qty: event.target.value })} />
                    <input aria-label="Item price" className={`${inputClass} text-left`} value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} />
                    <div className="flex justify-start gap-1">
                      <button onClick={saveEdit} className="grid h-9 w-9 place-items-center rounded-control bg-[var(--color-kahel-500)] text-white" aria-label="Save item"><Save className="h-4 w-4" /></button>
                      <button onClick={() => { if (creatingCode === editingCode) setItems((current) => current.filter((item) => item.code !== editingCode)); setEditingCode(null); setCreatingCode(null); setDraft(null); }} className="grid h-9 w-9 place-items-center rounded-control border border-[var(--color-border)]" aria-label="Cancel edit"><X className="h-4 w-4" /></button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-[13px] text-[var(--color-text-secondary)]">{item.code}</div>
                    <div className="font-semibold text-[var(--color-text-primary)]">{item.name}</div>
                    <div className="text-[13px] text-[var(--color-text-secondary)]">{item.detail}</div>
                    <div className="text-left text-[13px] text-[var(--color-text-muted)]">{item.qty ?? ""}</div>
                    <div className="flex w-full justify-start text-left font-display font-semibold">{item.price}</div>
                    {canManage ? <button onClick={() => startEditing(item)} className="mr-auto grid h-10 w-10 place-items-center rounded-control text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-kahel-700)]" aria-label={`Edit ${item.name}`}><MoreHorizontal className="h-5 w-5" /></button> : <span />}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
