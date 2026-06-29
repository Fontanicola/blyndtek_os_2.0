"use client";

import { cn } from "@/lib/cn";
import { formatUSD } from "@/lib/utils/formatters";

type MetricaCardProps = {
  label: string;
  value: string | number;
  trend?: string;
  direction?: "up" | "down";
  className?: string;
};

export function MetricaCard({ label, value, trend, direction, className }: MetricaCardProps) {
  const displayValue = typeof value === "number" ? formatUSD(value) : value;

  return (
    <div className={cn("rounded-card bg-white p-5 shadow-card", className)}>
      <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-2xl font-title text-carbon">{displayValue}</p>
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
      </div>
    </div>
  );
}
