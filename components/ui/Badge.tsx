import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { BadgeVariant } from "@/types/ui";

type BadgeProps = {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
};

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-paper text-graphite",
  signal: "bg-signal-light text-signal",
  success: "bg-success-light text-success",
  warning: "bg-warning-light text-warning",
  danger: "bg-danger-light text-danger",
  ghost: "border border-line bg-transparent text-graphite"
};

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center justify-center rounded-pill px-2 text-center text-xs font-label leading-none",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
