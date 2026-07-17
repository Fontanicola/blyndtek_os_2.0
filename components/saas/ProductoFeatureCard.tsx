"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Card } from "@/components/ui";
import { MoreVerticalIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { ProductoFeature } from "@/types/productos";

type ProductoFeatureCardProps = {
  feature: ProductoFeature;
  clienteNombre?: string | null;
  isDragging?: boolean;
  draggable?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDragStart?: (feature: ProductoFeature) => void;
  onDragEnd?: () => void;
};

const priorityBadgeVariant = {
  alta: "danger",
  media: "warning",
  baja: "default"
} as const;

const priorityBackground = {
  alta: "bg-danger-light",
  media: "bg-warning-light",
  baja: "bg-white"
} as const;

export function ProductoFeatureCard({
  feature,
  clienteNombre,
  isDragging = false,
  draggable = false,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd
}: ProductoFeatureCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const priorityLabel = useMemo(() => {
    if (feature.prioridad === "alta") return "Alta";
    if (feature.prioridad === "media") return "Media";
    return "Baja";
  }, [feature.prioridad]);

  const cardBg = feature.estado === "lanzado" ? "bg-white" : priorityBackground[feature.prioridad];

  return (
    <div ref={rootRef} className="relative">
      <Card
        padding="sm"
        onClick={onEdit}
        className={cn(
          "border border-transparent transition-shadow duration-fast ease-fast hover:shadow-card",
          cardBg,
          isDragging && "opacity-50"
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
          className="space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-label text-carbon">{feature.titulo}</p>
              {feature.descripcion ? <p className="mt-1 line-clamp-2 text-xs text-graphite">{feature.descripcion}</p> : null}
            </div>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen((current) => !current);
              }}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-component text-graphite transition-colors duration-fast ease-fast hover:bg-paper hover:text-carbon"
              aria-label="Abrir acciones"
            >
              <MoreVerticalIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={priorityBadgeVariant[feature.prioridad]} className="text-[11px]">
              {priorityLabel}
            </Badge>
            {clienteNombre ? (
              <Badge variant="ghost" className="max-w-[180px] truncate text-[11px]">
                {clienteNombre}
              </Badge>
            ) : null}
          </div>
        </div>
      </Card>

      {menuOpen ? (
        <div className="absolute right-2 top-10 z-20 w-40 rounded-card border border-line-soft bg-white p-1 shadow-modal">
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onEdit();
            }}
            className="w-full rounded-component px-3 py-2 text-left text-sm text-carbon transition-colors duration-fast ease-fast hover:bg-paper"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onDelete();
            }}
            className="w-full rounded-component px-3 py-2 text-left text-sm text-danger transition-colors duration-fast ease-fast hover:bg-danger-light"
          >
            Eliminar
          </button>
        </div>
      ) : null}
    </div>
  );
}
