"use client";

import { Card } from "@/components/ui";
import { cn } from "@/lib/cn";

type MetricaGrandeProps = {
  label: string;
  value: string;
  comparison?: string | null;
  trend?: "up" | "down" | "neutral";
  emptyState?: string;
  className?: string;
};

export function MetricaGrande({
  label,
  value,
  comparison,
  trend = "neutral",
  emptyState,
  className
}: MetricaGrandeProps) {
  const showEmpty = value.trim().length === 0 || value === "N/A";

  return (
    <Card padding="lg" className={cn("space-y-3", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-label uppercase tracking-[0.1em] text-graphite">{label}</p>
        {comparison ? (
          <span
            className={cn(
              "text-xs font-label",
              trend === "up" ? "text-success" : trend === "down" ? "text-danger" : "text-graphite"
            )}
          >
            {comparison}
          </span>
        ) : null}
      </div>
      <p className="text-3xl font-title text-carbon">{showEmpty ? emptyState ?? "Sin datos" : value}</p>
    </Card>
  );
}

