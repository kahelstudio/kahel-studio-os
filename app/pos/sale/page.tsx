"use client";

import { useMemo, useState } from "react";
import { Package } from "lucide-react";
import { PRODUCTS } from "@/lib/sample-data";
import { cn, formatPeso } from "@/lib/utils";
import { useToast } from "@/components/toast/toast-provider";

const CATEGORIES = ["All", "Prints", "Frames", "Albums"] as const;

export default function PosSalePage() {
  const { fireToast } = useToast();
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const [cart, setCart] = useState<Record<string, number>>({});

  const filtered = PRODUCTS.filter((p) => category === "All" || p.category === category);

  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => ({ product: PRODUCTS.find((p) => p.id === id)!, qty })),
    [cart]
  );

  const subtotalCentavos = cartLines.reduce((sum, l) => sum + l.product.price * 100 * l.qty, 0);

  function addToCart(id: string) {
    setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  }

  function inc(id: string) {
    setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  }

  function dec(id: string) {
    setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] || 0) - 1) }));
  }

  function charge() {
    fireToast(`Payment recorded · ${formatPeso(subtotalCentavos)} · receipt emailed`, "success");
    setCart({});
  }

  return (
    <div className="flex min-h-full flex-col bg-[var(--color-surface-muted)] xl:flex-row">
      <div className="min-w-0 flex-1 overflow-y-auto p-5 sm:p-6">
        <div className="mb-[18px] flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-semibold">Products</h1>
          <div className="flex flex-wrap gap-1.5 sm:ml-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "h-11 rounded-pill px-4 text-sm font-semibold",
                  c === category
                    ? "border border-[var(--color-kahel-500)] bg-[var(--color-kahel-500)] text-white"
                    : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <span className="ml-auto hidden items-center gap-2 rounded-pill border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[13px] text-[var(--color-text-secondary)] 2xl:flex">
            iPad landscape · 1024×768
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => addToCart(p.id)}
              className="flex min-h-[190px] flex-col overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] text-left"
            >
              <div className="flex h-24 items-center justify-center" style={{ background: p.swatch }}>
                <Package className="h-8 w-8 text-white/90" strokeWidth={1.5} />
              </div>
              <div className="p-3.5">
                <div className="text-sm font-semibold leading-[18px]">{p.name}</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-display text-base font-semibold">{formatPeso(p.price * 100)}</span>
                  <span
                    className="text-xs"
                    style={{ color: p.stock <= 5 ? "var(--color-danger-text)" : "var(--color-text-muted)" }}
                  >
                    In stock
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex w-full shrink-0 flex-col border-t border-[var(--color-border)] bg-[var(--color-surface)] xl:w-[380px] xl:border-l xl:border-t-0">
        <div className="border-b border-[var(--color-border)] px-[22px] py-5">
          <div className="font-display text-xl font-semibold">Current sale</div>
          <div className="mt-0.5 text-[13px] text-[var(--color-text-secondary)]">Walk-in · no account</div>
        </div>
        <div className="max-h-[360px] flex-1 overflow-y-auto px-3 py-2 xl:max-h-none">
          {cartLines.length === 0 && (
            <div className="px-3 py-10 text-center text-sm text-[var(--color-text-muted)]">
              Tap a product to add it to the sale.
            </div>
          )}
          {cartLines.map(({ product, qty }) => (
            <div key={product.id} className="flex items-center gap-3 border-b border-[var(--color-border)] px-2.5 py-3">
              <div className="h-10 w-10 shrink-0 rounded-control" style={{ background: product.swatch }} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{product.name}</div>
                <div className="text-xs text-[var(--color-text-secondary)]">{formatPeso(product.price * 100)} each</div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => dec(product.id)}
                  className="flex h-11 w-11 items-center justify-center rounded-control border border-[var(--color-border)] text-lg text-[var(--color-text-secondary)]"
                >
                  −
                </button>
                <span className="w-[22px] text-center text-sm font-semibold">{qty}</span>
                <button
                  onClick={() => inc(product.id)}
                  className="flex h-11 w-11 items-center justify-center rounded-control border border-[var(--color-border)] text-lg text-[var(--color-text-secondary)]"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-[var(--color-border)] px-[22px] py-[18px]">
          <div className="flex justify-between py-0.5 text-sm text-[var(--color-text-secondary)]">
            <span>Subtotal</span>
            <span>{formatPeso(subtotalCentavos)}</span>
          </div>
          <div className="flex items-center justify-between py-2.5 pb-4">
            <span className="text-base font-semibold">Total</span>
            <span className="font-display text-[28px] font-bold">{formatPeso(subtotalCentavos)}</span>
          </div>
          <button
            disabled={cartLines.length === 0}
            onClick={charge}
            className="h-[60px] w-full rounded-control bg-[var(--color-kahel-500)] font-display text-lg font-semibold text-white hover:bg-[var(--color-kahel-600)] disabled:opacity-40"
          >
            Charge {formatPeso(subtotalCentavos)}
          </button>
        </div>
      </div>
    </div>
  );
}
