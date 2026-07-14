"use client";

import { useRouter } from "next/navigation";
import { Badge, Card, UserAvatar } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatFecha } from "@/lib/utils/formatters";
import { TAREA_PRIORIDAD_LABELS, isTareaVencida } from "@/lib/tareas";
import type { Usuario } from "@/types/auth";
import type { Tarea } from "@/types/tareas";

type TareaCardProps = {
  tarea: Tarea;
  proyectoNombre?: string | null;
  responsableNombre?: string | null;
  responsableUsuario?: Pick<Usuario, "nombre" | "foto_url"> | null;
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

function getPriorityBackgroundClass(prioridad: Tarea["prioridad"], estado: Tarea["estado"]) {
  if (estado === "terminada") {
    return "!bg-white";
  }

  if (prioridad === "alta") {
    return "!bg-danger-light";
  }

  if (prioridad === "media") {
    return "!bg-warning-light";
  }

  return "!bg-white";
}

export function TareaCard({
  tarea,
  proyectoNombre,
  responsableNombre,
  responsableUsuario,
  onClick,
  draggable = false,
  isDragging = false,
  onDragStart,
  onDragEnd
}: TareaCardProps) {
  const overdue = isTareaVencida(tarea);
  const router = useRouter();

  return (
    <Card
      padding="md"
      onClick={onClick}
      className={cn(
        "shrink-0",
        getPriorityBackgroundClass(tarea.prioridad, tarea.estado),
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
            <button
              type="button"
              disabled={!tarea.proyecto_id}
              onClick={(event) => {
                event.stopPropagation();
                if (!tarea.proyecto_id) {
                  return;
                }

                router.push(`/proyectos?project_id=${tarea.proyecto_id}`);
              }}
              className={cn(
                "mt-1 block text-left text-xs text-graphite transition-colors duration-fast ease-fast",
                tarea.proyecto_id && "cursor-pointer hover:text-signal hover:underline"
              )}
            >
              {proyectoNombre ? proyectoNombre : "Sin proyecto"}
            </button>
            {tarea.fase_nombre ? (
              <p className="mt-1 truncate text-xs text-graphite">{tarea.fase_nombre}</p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1 text-xs text-graphite">
            <p>{tarea.fecha_limite ? formatFecha(tarea.fecha_limite) : "Sin fecha límite"}</p>
            {overdue ? <p className="font-label text-danger">Vencida</p> : null}
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant={getPrioridadVariant(tarea.prioridad)}
              className={tarea.estado === "terminada" ? "bg-paper text-graphite" : undefined}
            >
              {TAREA_PRIORIDAD_LABELS[tarea.prioridad]}
            </Badge>
            {tarea.es_ia ? (
              <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-signal-light px-2 text-[10px] font-label tracking-[0.08em] text-signal">
                IA
              </span>
            ) : (
              <UserAvatar
                name={responsableUsuario?.nombre ?? responsableNombre ?? null}
                fotoUrl={responsableUsuario?.foto_url ?? null}
                size="xs"
                className="shrink-0"
                textClassName="text-[9px]"
              />
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
