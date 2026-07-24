"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CalendarClock, ShoppingCart, UserPlus, X } from "lucide-react";

const ITEMS = [
  {
    id: "booking",
    label: "New booking",
    description: "Start a booking for a shoot",
    href: "/booking/list",
    icon: CalendarClock,
  },
  {
    id: "account",
    label: "New account",
    description: "Add a client or corporate account",
    href: "/crm/accounts",
    icon: UserPlus,
  },
  {
    id: "sale",
    label: "New sale",
    description: "Ring up a POS sale",
    href: "/pos/sale",
    icon: ShoppingCart,
  },
];

export function QuickCreateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
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
      <div
        className="absolute inset-0 bg-[rgba(10,10,10,0.4)]"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative flex h-full w-full max-w-sm flex-col bg-[var(--color-surface)] shadow-[var(--shadow-dialog)]">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <h2 className="font-display text-base font-semibold text-[var(--color-text-primary)]">
            Quick create
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-control text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col gap-1 p-3">
          {ITEMS.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              onClick={onClose}
              className="flex items-start gap-3 rounded-card px-3 py-3 hover:bg-[var(--color-surface-muted)]"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-control bg-[var(--color-kahel-100)] text-[var(--color-kahel-700)]">
                <item.icon className="h-4.5 w-4.5" strokeWidth={1.75} />
              </div>
              <div>
                <div className="font-display text-sm font-semibold text-[var(--color-text-primary)]">
                  {item.label}
                </div>
                <div className="text-[13px] text-[var(--color-text-secondary)]">
                  {item.description}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
