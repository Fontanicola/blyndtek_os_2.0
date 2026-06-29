"use client";

import { Badge } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { Feature } from "@/types/features";

type FeatureCardProps = {
  feature: Feature;
  onClick?: () => void;
  draggable?: boolean;
  isDragging?: boolean;
  onDragStart?: (feature: Feature) => void;
  onDragEnd?: () => void;
};

function getInitials(value: string | null) {
  if (!value) {
    return "--";
  }

  return value.slice(0, 2).toUpperCase();
}

function getEstadoVariant(estado: Feature["estado"]) {
  if (estado === "lista") {
    return "success" as const;
  }

  if (estado === "en_curso") {
    return "signal" as const;
  }

  return "default" as const;
}

export function FeatureCard({
  feature,
  onClick,
  draggable = false,
  isDragging = false,
  onDragStart,
  onDragEnd
}: FeatureCardProps) {
  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={() => onDragStart?.(feature)}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        "w-full rounded-card bg-white p-4 text-left shadow-soft transition-all duration-fast ease-fast hover:shadow-card",
        isDragging && "opacity-50"
      )}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-label text-carbon">{feature.nombre}</p>
            <p className="mt-1 text-xs text-graphite">{feature.descripcion}</p>
          </div>
          <Badge variant={getEstadoVariant(feature.estado)}>{feature.estado}</Badge>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Badge variant="ghost">{feature.fase}</Badge>
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-signal-light text-[10px] font-label text-signal">
            {getInitials(feature.responsable_id)}
          </div>
        </div>
      </div>
    </button>
  );
}
