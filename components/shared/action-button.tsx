"use client";

import Link from "next/link";
import { useToast } from "@/components/toast/toast-provider";
import { cn } from "@/lib/utils";

type ActionButtonProps = {
  children: React.ReactNode;
  href?: string;
  className?: string;
  /** Toast message when no href or onClick is provided */
  label?: string;
  onClick?: () => void;
};

export function ActionButton({ children, href, className, label, onClick }: ActionButtonProps) {
  const { fireToast } = useToast();

  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={cn("cursor-pointer", className)}
      onClick={() => {
        if (onClick) {
          onClick();
        } else {
          fireToast(label ? `${label} — coming soon.` : "Coming soon.", "info");
        }
      }}
    >
      {children}
    </button>
  );
}
