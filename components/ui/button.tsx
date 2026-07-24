import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control font-display text-sm font-semibold transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus-ring)]",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--color-kahel-500)] text-white hover:bg-[var(--color-kahel-600)] active:bg-[var(--color-kahel-700)]",
        secondary:
          "bg-[var(--color-surface)] text-[var(--color-text-primary)] border border-[var(--color-border-strong)] hover:bg-[var(--color-surface-muted)]",
        ghost:
          "bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)]",
        danger:
          "bg-[var(--color-danger)] text-white hover:opacity-90",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-9 px-3 text-[13px]",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size, className }))} {...props} />
  );
}
