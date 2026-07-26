"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Camera, ChevronRight, ShoppingCart, Users, X } from "lucide-react";
import { ACCENTS } from "@/lib/apps-config";

const ITEMS = [
  {
    id: "booking",
    title: "New booking",
    description: "Start an inquiry or quote",
    href: "/booking/list",
    icon: Camera,
    accent: ACCENTS.orange,
  },
  {
    id: "account",
    title: "New account",
    description: "Corporate or consumer",
    href: "/crm/accounts",
    icon: Users,
    accent: ACCENTS.indigo,
  },
  {
    id: "sale",
    title: "New sale",
    description: "Open the point of sale",
    href: "/pos/sale",
    icon: ShoppingCart,
    accent: ACCENTS.orange,
  },
];

export function QuickCreateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-[rgba(20,20,20,0.35)]" onClick={onClose} aria-hidden />
      <div className="relative flex h-full w-full max-w-[440px] flex-col bg-[var(--color-surface)] shadow-[-20px_0_60px_-20px_rgba(10,10,10,0.4)]">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-[22px]">
          <h2 className="font-display text-xl font-semibold text-[var(--color-text-primary)]">
            Quick create
          </h2>
          <button
            onClick={onClose}
            className="flex h-[34px] w-[34px] items-center justify-center rounded-control border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col gap-3 p-4">
          {ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                router.push(item.href);
                onClose();
              }}
              className="flex items-center gap-4 rounded-card border border-[var(--color-border)] p-[18px] text-left hover:bg-[var(--color-canvas)]"
              style={{ "--tile-accent": item.accent.base } as React.CSSProperties}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = item.accent.base)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "")}
            >
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control"
                style={{ background: item.accent.tint, color: item.accent.text }}
              >
                <item.icon className="h-[22px] w-[22px]" strokeWidth={1.75} />
              </span>
              <div>
                <div className="font-display text-base font-semibold text-[var(--color-text-primary)]">
                  {item.title}
                </div>
                <div className="mt-0.5 text-[13px] text-[var(--color-text-secondary)]">
                  {item.description}
                </div>
              </div>
              <ChevronRight className="ml-auto h-4 w-4 text-[var(--color-text-muted)]" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
