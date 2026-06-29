"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { useTareas } from "@/lib/hooks/useTareas";
import type { TaskProjectOption, TaskUserOption } from "@/lib/task-support";
import type { CreateTareaInput, EstadoTarea, Tarea } from "@/types/tareas";
import type { Usuario } from "@/types/auth";
import { TareaFiltros } from "./TareaFiltros";
import { TareaModal } from "./TareaModal";
import { TareasKanban } from "./TareasKanban";

type TareasClientProps = {
  usuario: Usuario | null;
  proyectos: TaskProjectOption[];
  usuarios: TaskUserOption[];
};

type TareaFilters = {
  proyecto_id?: string;
  responsable_id?: string;
  prioridad?: "alta" | "media" | "baja";
};

export function TareasClient({ usuario, proyectos, usuarios }: TareasClientProps) {
  const { tareas, loading, error, fetchTareas, createTarea, updateTarea, updateEstado, deleteTarea } =
    useTareas();
  const [filters, setFilters] = useState<TareaFilters>({});
  const [showArchived, setShowArchived] = useState(false);
  const [selectedTarea, setSelectedTarea] = useState<Tarea | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [initialEstado, setInitialEstado] = useState<EstadoTarea>("nueva");

  useEffect(() => {
    void fetchTareas(filters);
  }, [fetchTareas, filters]);

  const visibleTareas = useMemo(() => {
    return showArchived ? tareas : tareas.filter((tarea) => tarea.estado !== "terminada");
  }, [showArchived, tareas]);

  async function handleSave(input: CreateTareaInput): Promise<void> {
    if (selectedTarea) {
      await updateTarea(selectedTarea.id, input);
      return;
    }

    await createTarea({
      ...input,
      responsable_id: input.responsable_id ?? usuario?.id ?? undefined
    });
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-card border border-danger bg-danger-light px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-title text-carbon">Tareas</h1>
          <p className="mt-1 text-sm text-graphite">
            Tareas del día a día con vínculo opcional a proyectos y alta rápida global.
          </p>
        </div>

        <Button
          onClick={() => {
            setSelectedTarea(null);
            setInitialEstado("nueva");
            setModalOpen(true);
          }}
        >
          Nueva tarea
        </Button>
      </div>

      <TareaFiltros
        filtros={filters}
        proyectos={proyectos}
        usuarios={usuarios}
        onChange={setFilters}
        onClear={() => setFilters({})}
      />

      <div className="flex items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-sm text-carbon">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(event) => setShowArchived(event.target.checked)}
            className="h-4 w-4 rounded border-line text-signal focus:ring-signal/20"
          />
          Mostrar tareas terminadas archivadas
        </label>

        <Badge variant="default">{visibleTareas.length} tareas</Badge>
      </div>

      {loading && tareas.length === 0 ? (
        <div className="text-sm text-graphite">Cargando tareas...</div>
      ) : null}

      <Card padding="lg" className="space-y-4">
        <TareasKanban
          tareas={visibleTareas}
          proyectos={proyectos}
          usuarios={usuarios}
          onTareaClick={(tarea) => {
            setSelectedTarea(tarea);
            setInitialEstado(tarea.estado);
            setModalOpen(true);
          }}
          onAddTarea={(estado) => {
            setSelectedTarea(null);
            setInitialEstado(estado);
            setModalOpen(true);
          }}
          onMoveTarea={async (id, estado) => {
            await updateEstado(id, estado);
          }}
        />
      </Card>

      <TareaModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedTarea(null);
        }}
        tarea={selectedTarea}
        proyectos={proyectos}
        usuarios={usuarios}
        defaultEstado={initialEstado}
        defaultResponsableId={usuario?.id}
        onSave={handleSave}
        onDelete={
          selectedTarea
            ? async () => {
                await deleteTarea(selectedTarea.id);
                setModalOpen(false);
                setSelectedTarea(null);
              }
            : undefined
        }
      />
    </div>
  );
}
