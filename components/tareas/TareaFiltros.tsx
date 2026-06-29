"use client";

import { Button, Card } from "@/components/ui";
import type { TaskProjectOption, TaskUserOption } from "@/lib/task-support";
import type { PrioridadTarea } from "@/types/tareas";

type TareaFiltersValue = {
  proyecto_id?: string;
  responsable_id?: string;
  prioridad?: PrioridadTarea;
};

type TareaFiltrosProps = {
  filtros: TareaFiltersValue;
  proyectos: TaskProjectOption[];
  usuarios: TaskUserOption[];
  onChange: (filtros: TareaFiltersValue) => void;
  onClear: () => void;
};

export function TareaFiltros({ filtros, proyectos, usuarios, onChange, onClear }: TareaFiltrosProps) {
  return (
    <Card padding="md" className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="space-y-1">
          <label className="block text-sm font-label text-carbon">Proyecto</label>
          <select
            value={filtros.proyecto_id ?? ""}
            onChange={(event) => onChange({ ...filtros, proyecto_id: event.target.value || undefined })}
            className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
          >
            <option value="">Todos</option>
            {proyectos.map((proyecto) => (
              <option key={proyecto.id} value={proyecto.id}>
                {proyecto.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-label text-carbon">Responsable</label>
          <select
            value={filtros.responsable_id ?? ""}
            onChange={(event) => onChange({ ...filtros, responsable_id: event.target.value || undefined })}
            className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
          >
            <option value="">Todos</option>
            {usuarios.map((usuario) => (
              <option key={usuario.id} value={usuario.id}>
                {usuario.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-label text-carbon">Prioridad</label>
          <select
            value={filtros.prioridad ?? ""}
            onChange={(event) =>
              onChange({
                ...filtros,
                prioridad: (event.target.value || undefined) as PrioridadTarea | undefined
              })
            }
            className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
          >
            <option value="">Todas</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </div>

        <div className="flex items-end">
          <Button variant="ghost" size="sm" onClick={onClear} className="w-full">
            Limpiar filtros
          </Button>
        </div>
      </div>
    </Card>
  );
}
