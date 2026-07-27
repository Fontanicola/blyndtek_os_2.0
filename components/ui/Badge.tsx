import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { BadgeVariant } from "@/types/ui";

type BadgeProps = {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
};

const variantClasses: Record<BadgeVariant, string> = {
  default: "border border-line-soft bg-paper text-graphite",
  signal: "border border-signal/15 bg-signal-light text-signal",
  success: "border border-success/15 bg-success-light text-success",
  warning: "border border-warning/15 bg-warning-light text-warning",
  danger: "border border-danger/15 bg-danger-light text-danger",
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
