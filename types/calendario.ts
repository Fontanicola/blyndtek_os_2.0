import type { TipoEvento } from "@/types/eventos";

export type CalendarViewMode = "month" | "week" | "day";

export type CalendarItem = {
  id: string;
  titulo: string;
  start: string;
  end: string;
  tipo: TipoEvento;
  source: "evento" | "tarea" | "lead";
  referenceId: string;
  usuarioId?: string | null;
  details?: string | null;
};

export type CalendarUserOption = {
  id: string;
  nombre: string;
  email: string;
  rol: "admin" | "miembro";
};
