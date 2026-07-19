"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui";
import { formatUSD } from "@/lib/utils/formatters";
import type { BadgeVariant } from "@/types/ui";

type MetricaCardProps = {
  label: string;
  value: string | number;
  icono?: ReactNode;
  colorIcono?: "signal" | "success" | "danger" | "warning" | "graphite";
  description?: string;
  trend?: string;
  direction?: "up" | "down";
  status?: {
    label: string;
    variant: BadgeVariant;
  };
  className?: string;
};

const iconBackgroundClasses: Record<NonNullable<MetricaCardProps["colorIcono"]>, string> = {
  signal: "bg-signal-light text-signal",
  success: "bg-success-light text-success",
  danger: "bg-danger-light text-danger",
  warning: "bg-warning-light text-warning",
  graphite: "bg-paper text-graphite"
};

export function MetricaCard({
  label,
  value,
  icono,
  colorIcono = "signal",
  description,
  trend,
  direction,
  status,
  className
}: MetricaCardProps) {
  const displayValue = typeof value === "number" ? formatUSD(value) : value;
  const isLongText = typeof displayValue === "string" && displayValue.length > 10;
  const hasIcon = Boolean(icono);

  return (
    <div className={cn("rounded-card border border-line-soft bg-white p-5 shadow-soft", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">{label}</p>
          <p className={cn("mt-2 font-title text-carbon", isLongText ? "text-lg leading-tight" : "text-2xl")}>
            {displayValue}
          </p>
        </div>

        {hasIcon ? (
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              iconBackgroundClasses[colorIcono]
            )}
          >
            {icono}
          </div>
        ) : null}
      </div>

      {description ? <p className="mt-3 text-xs text-graphite">{description}</p> : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        {trend ? (
          <span
            className={cn(
              "text-xs font-label",
              direction === "down" ? "text-danger" : direction === "up" ? "text-success" : "text-graphite"
            )}
          >
            {direction === "down" ? "↓ " : direction === "up" ? "↑ " : ""}
            {trend}
          </span>
        ) : null}

        {status ? <Badge variant={status.variant}>{status.label}</Badge> : null}
      </div>
    </div>
  );
}
