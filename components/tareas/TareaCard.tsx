"use client";

import { Badge, Card } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatFecha } from "@/lib/utils/formatters";
import { TAREA_PRIORIDAD_LABELS, isTareaVencida } from "@/lib/tareas";
import type { Tarea } from "@/types/tareas";

type TareaCardProps = {
  tarea: Tarea;
  proyectoNombre?: string | null;
  responsableNombre?: string | null;
  onClick: () => void;
  draggable?: boolean;
  isDragging?: boolean;
  onDragStart?: (tarea: Tarea) => void;
  onDragEnd?: () => void;
};

function getPrioridadVariant(prioridad: Tarea["prioridad"]) {
  if (prioridad === "alta") {
    return "danger" as const;
  }

  if (prioridad === "media") {
    return "warning" as const;
  }

  return "default" as const;
}

function getInitials(value: string | null | undefined) {
  if (!value) {
    return "--";
  }

  return value.slice(0, 2).toUpperCase();
}

export function TareaCard({
  tarea,
  proyectoNombre,
  responsableNombre,
  onClick,
  draggable = false,
  isDragging = false,
  onDragStart,
  onDragEnd
}: TareaCardProps) {
  const overdue = isTareaVencida(tarea);

  return (
    <Card
      padding="md"
      onClick={onClick}
      className={cn(
        "border-l-2 border-transparent",
        overdue && "border-danger",
        isDragging && "opacity-50"
      )}
    >
      <div
        draggable={draggable}
        onDragStart={() => onDragStart?.(tarea)}
        onDragEnd={onDragEnd}
        className="space-y-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-label text-carbon">{tarea.titulo}</p>
            <p className="mt-1 text-xs text-graphite">
              {proyectoNombre ? proyectoNombre : "Sin proyecto"}
            </p>
          </div>
          <Badge variant={getPrioridadVariant(tarea.prioridad)}>{TAREA_PRIORIDAD_LABELS[tarea.prioridad]}</Badge>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1 text-xs text-graphite">
            <p>{tarea.fecha_limite ? formatFecha(tarea.fecha_limite) : "Sin fecha límite"}</p>
            {overdue ? <p className="font-label text-danger">Vencida</p> : null}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-signal-light text-[10px] font-label text-signal">
              {getInitials(responsableNombre)}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
