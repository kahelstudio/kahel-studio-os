"use client";

import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

type ToastTone = "default" | "success" | "danger" | "info";

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  fireToast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_ICON: Record<ToastTone, React.ElementType> = {
  default: CheckCircle2,
  success: CheckCircle2,
  danger: TriangleAlert,
  info: Info,
};

const TONE_ICON_COLOR: Record<ToastTone, string> = {
  default: "text-[var(--color-success)]",
  success: "text-[var(--color-success)]",
  danger: "text-[var(--color-danger)]",
  info: "text-[var(--color-info)]",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const fireToast = useCallback((message: string, tone: ToastTone = "default") => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const value = useMemo(() => ({ fireToast }), [fireToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
        {toasts.map((t) => {
          const Icon = TONE_ICON[t.tone];
          return (
            <div
              key={t.id}
              className={cn(
                "pointer-events-auto flex items-center gap-2.5 rounded-card border px-4 py-3 text-sm font-medium shadow-[var(--shadow-menu)]",
                "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)]",
                "toast-enter"
              )}
              role="status"
            >
              <Icon className={cn("h-4 w-4 shrink-0", TONE_ICON_COLOR[t.tone])} />
              <span>{t.message}</span>
              <button
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                className="ml-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
