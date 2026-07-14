"use client";

import { Badge, Card, UserAvatar } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { Usuario } from "@/types/auth";
import type { Feature } from "@/types/features";

type FeatureCardProps = {
  feature: Feature;
  faseLabel?: string | null;
  responsableUsuario?: Pick<Usuario, "nombre" | "foto_url"> | null;
  onClick?: () => void;
  draggable?: boolean;
  isDragging?: boolean;
  onDragStart?: (feature: Feature) => void;
  onDragEnd?: () => void;
};

export function FeatureCard({
  feature,
  faseLabel,
  responsableUsuario,
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

          <UserAvatar
            name={responsableUsuario?.nombre ?? feature.responsable_id}
            fotoUrl={responsableUsuario?.foto_url ?? null}
            size="xs"
            className="shrink-0"
            textClassName="text-[9px]"
          />
        </div>
      </div>
    </Card>
  );
}
