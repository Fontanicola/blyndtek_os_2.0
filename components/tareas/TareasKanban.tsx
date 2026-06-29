"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { cn } from "@/lib/cn";
import { sortTareas } from "@/lib/tareas";
import type { TaskProjectOption, TaskUserOption } from "@/lib/task-support";
import type { EstadoTarea, Tarea } from "@/types/tareas";
import { TareaCard } from "./TareaCard";

type TareasKanbanProps = {
  tareas: Tarea[];
  proyectos: TaskProjectOption[];
  usuarios: TaskUserOption[];
  onTareaClick: (tarea: Tarea) => void;
  onAddTarea: (estado: EstadoTarea) => void;
  onMoveTarea: (id: string, estado: EstadoTarea) => Promise<void>;
};

const columns: Array<{ estado: EstadoTarea; label: string }> = [
  { estado: "nueva", label: "Nueva" },
  { estado: "en_proceso", label: "En proceso" },
  { estado: "terminada", label: "Terminada" }
];

function getProjectName(projectId: string | null, proyectos: TaskProjectOption[]) {
  if (!projectId) {
    return null;
  }

  return proyectos.find((proyecto) => proyecto.id === projectId)?.nombre ?? null;
}

function getUserName(userId: string, usuarios: TaskUserOption[]) {
  return usuarios.find((usuario) => usuario.id === userId)?.nombre ?? null;
}

export function TareasKanban({
  tareas,
  proyectos,
  usuarios,
  onTareaClick,
  onAddTarea,
  onMoveTarea
}: TareasKanbanProps) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<EstadoTarea | null>(null);

  const grouped = useMemo(
    () =>
      columns.map((column) => ({
        ...column,
        tareas: sortTareas(tareas.filter((tarea) => tarea.estado === column.estado))
      })),
    [tareas]
  );

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {grouped.map((column) => (
        <section
          key={column.estado}
          className={cn(
            "flex min-h-[560px] min-w-[300px] max-w-[300px] flex-col rounded-card bg-paper p-3 transition-all duration-fast ease-fast",
            dropTarget === column.estado && "ring-2 ring-signal"
          )}
          onDragOver={(event) => {
            event.preventDefault();
            setDropTarget(column.estado);
          }}
          onDragLeave={() => {
            setDropTarget((current) => (current === column.estado ? null : current));
          }}
          onDrop={async (event) => {
            event.preventDefault();
            if (draggedTaskId) {
              await onMoveTarea(draggedTaskId, column.estado);
            }
            setDraggedTaskId(null);
            setDropTarget(null);
          }}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-label text-graphite">{column.label}</h3>
              <Badge variant="default">{column.tareas.length}</Badge>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {column.tareas.length > 0 ? (
              column.tareas.map((tarea) => (
                <TareaCard
                  key={tarea.id}
                  tarea={tarea}
                  proyectoNombre={getProjectName(tarea.proyecto_id, proyectos)}
                  responsableNombre={getUserName(tarea.responsable_id, usuarios)}
                  onClick={() => onTareaClick(tarea)}
                  draggable
                  isDragging={draggedTaskId === tarea.id}
                  onDragStart={(current) => setDraggedTaskId(current.id)}
                  onDragEnd={() => setDraggedTaskId(null)}
                />
              ))
            ) : (
              <Card padding="sm">
                <p className="text-sm text-graphite">Sin tareas en esta columna.</p>
              </Card>
            )}
          </div>

          <div className="pt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAddTarea(column.estado)}
              className="w-full justify-center"
            >
              + Tarea
            </Button>
          </div>
        </section>
      ))}
    </div>
  );
}
