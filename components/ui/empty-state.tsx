import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-[var(--color-border-strong)] px-8 py-16 text-center",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface-muted)]">
        <Icon className="h-6 w-6 text-[var(--color-text-muted)]" />
      </div>
      <h3 className="font-display text-base font-semibold text-[var(--color-text-primary)]">
        {title}
      </h3>
      <p className="max-w-sm text-sm text-[var(--color-text-secondary)]">{description}</p>
      {action}
    </div>
  );
}
