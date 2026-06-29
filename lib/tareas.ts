import type { EstadoTarea, PrioridadTarea, Tarea } from "@/types/tareas";

export const TAREA_ESTADO_LABELS: Record<EstadoTarea, string> = {
  nueva: "Nueva",
  en_proceso: "En proceso",
  terminada: "Terminada"
};

export const TAREA_ESTADO_OPTIONS = Object.keys(TAREA_ESTADO_LABELS) as EstadoTarea[];

export const TAREA_PRIORIDAD_LABELS: Record<PrioridadTarea, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja"
};

export const TAREA_PRIORIDAD_OPTIONS = Object.keys(TAREA_PRIORIDAD_LABELS) as PrioridadTarea[];

export function sortTareas(tareas: Tarea[]) {
  return [...tareas].sort((first, second) => {
    if (first.fecha_limite && second.fecha_limite) {
      const dateDiff = new Date(first.fecha_limite).getTime() - new Date(second.fecha_limite).getTime();
      if (dateDiff !== 0) {
        return dateDiff;
      }
    }

    if (first.fecha_limite && !second.fecha_limite) {
      return -1;
    }

    if (!first.fecha_limite && second.fecha_limite) {
      return 1;
    }

    return new Date(second.created_at).getTime() - new Date(first.created_at).getTime();
  });
}

export function isTareaVencida(tarea: Pick<Tarea, "fecha_limite" | "estado">) {
  if (!tarea.fecha_limite || tarea.estado === "terminada") {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(tarea.fecha_limite);
  dueDate.setHours(0, 0, 0, 0);

  return dueDate.getTime() < today.getTime();
}
