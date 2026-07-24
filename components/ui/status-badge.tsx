import { cn } from "@/lib/utils";

export type StatusTone = "neutral" | "info" | "success" | "attention" | "danger";

const TONE_STYLES: Record<StatusTone, string> = {
  neutral: "bg-[var(--color-ink-100)] text-[var(--color-ink-600)]",
  info: "bg-[var(--color-info-bg)] text-[var(--color-info-text)]",
  success: "bg-[var(--color-success-bg)] text-[var(--color-success-text)]",
  attention: "bg-[var(--color-attention-bg)] text-[var(--color-attention-text)]",
  danger: "bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]",
};

export function StatusBadge({
  tone = "neutral",
  children,
  dot = false,
  className,
}: {
  tone?: StatusTone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-[13px] font-semibold leading-none",
        TONE_STYLES[tone],
        className
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
