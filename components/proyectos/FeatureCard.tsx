"use client";

import { Badge, Card } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { Feature } from "@/types/features";

type FeatureCardProps = {
  feature: Feature;
  faseLabel?: string | null;
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

export function FeatureCard({
  feature,
  faseLabel,
  onClick,
  draggable = false,
  isDragging = false,
  onDragStart,
  onDragEnd
}: FeatureCardProps) {
  const phaseText = faseLabel?.trim() ? faseLabel : "Sin fase";

  return (
    <Card
      padding="sm"
      onClick={onClick}
      className={cn(
        "shrink-0 border border-transparent bg-white transition-shadow duration-fast ease-fast hover:shadow-card",
        isDragging && "opacity-50",
        onClick && "cursor-pointer"
      )}
    >
      <div
        draggable={draggable}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", feature.id);
          onDragStart?.(feature);
        }}
        onDragEnd={onDragEnd}
        className="space-y-2"
      >
        <div className="space-y-1">
          <p className="truncate text-sm font-label text-carbon">{feature.nombre}</p>
          {feature.descripcion ? <p className="line-clamp-2 text-xs text-graphite">{feature.descripcion}</p> : null}
        </div>

        <div className="flex items-center justify-between gap-2">
          {phaseText === "Sin fase" ? (
            <Badge variant="ghost" className="max-w-[160px] truncate text-[11px]">
              Sin fase
            </Badge>
          ) : (
            <Badge variant="default" className="max-w-[160px] truncate text-[11px]">
              {phaseText}
            </Badge>
          )}

          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-signal-light text-[10px] font-label text-signal">
            {getInitials(feature.responsable_id)}
          </div>
        </div>
      </div>
    </Card>
  );
}
