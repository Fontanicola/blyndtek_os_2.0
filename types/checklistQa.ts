export type ChecklistQaItem = {
  id: string;
  fase_id: string;
  item: string;
  completado: boolean;
  completado_por: string | null;
  completado_at: string | null;
  orden: number;
  generado_por_ia: boolean;
  created_at: string;
};
