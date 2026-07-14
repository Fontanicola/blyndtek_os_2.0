"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Card } from "@/components/ui";
import { useTareas } from "@/lib/hooks/useTareas";
import type { TaskProjectOption, TaskUserOption } from "@/lib/task-support";
import type { CreateTareaInput, EstadoTarea, Tarea } from "@/types/tareas";
import type { Usuario } from "@/types/auth";
import { TareaModal } from "./TareaModal";
import { TareasKanban } from "./TareasKanban";

type TareasClientProps = {
  usuario: Usuario | null;
  proyectos: TaskProjectOption[];
  usuarios: TaskUserOption[];
};

export function TareasClient({ usuario, proyectos, usuarios }: TareasClientProps) {
  const isAdmin = usuario?.rol === "admin";
  const initialFilters = useMemo(
    () => (isAdmin ? undefined : usuario?.id ? { responsable_id: usuario.id } : undefined),
    [isAdmin, usuario?.id]
  );
  const { tareas, loading, error, fetchTareas, createTarea, updateTarea, updateEstado, deleteTarea } =
    useTareas(initialFilters);
  const [showArchived, setShowArchived] = useState(false);
  const [hideAiTasks, setHideAiTasks] = useState(false);
  const [taskViewer, setTaskViewer] = useState<"todos" | "yo" | string>(isAdmin ? "todos" : "yo");
  const [selectedTarea, setSelectedTarea] = useState<Tarea | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [initialEstado, setInitialEstado] = useState<EstadoTarea>("nueva");
  const viewerSyncReadyRef = useRef(false);
  const displayUsuarios = useMemo(
    () => (isAdmin ? usuarios : usuarios.filter((usuarioOption) => usuarioOption.id === usuario?.id)),
    [isAdmin, usuario?.id, usuarios]
  );

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    if (!viewerSyncReadyRef.current) {
      viewerSyncReadyRef.current = true;
      return;
    }

    if (taskViewer === "todos") {
      void fetchTareas();
      return;
    }

    if (taskViewer === "yo") {
      void fetchTareas(usuario?.id ? { responsable_id: usuario.id } : undefined);
      return;
    }

    void fetchTareas({ responsable_id: taskViewer });
  }, [fetchTareas, isAdmin, taskViewer, usuario?.id]);

  const visibleTareas = useMemo(() => {
    return tareas.filter((tarea) => {
      if (!showArchived && tarea.estado === "terminada") {
        return false;
      }

      if (hideAiTasks && tarea.es_ia) {
        return false;
      }

      return true;
    });
  }, [hideAiTasks, showArchived, tareas]);

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
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-hidden">
      {error ? (
        <div className="rounded-card border border-danger bg-danger-light px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          {isAdmin ? (
            <label className="inline-flex items-center gap-2 text-sm text-carbon">
              <span className="text-sm font-label text-graphite">Ver tareas de:</span>
              <select
                value={taskViewer}
                onChange={(event) => setTaskViewer(event.target.value)}
                className="min-w-[180px] rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon transition-all duration-fast ease-fast focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
              >
                <option value="todos">Todos</option>
                <option value="yo">Yo</option>
                {usuarios.map((usuarioOption) => (
                  <option key={usuarioOption.id} value={usuarioOption.id}>
                    {usuarioOption.nombre}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="inline-flex items-center gap-2 text-sm text-carbon">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(event) => setShowArchived(event.target.checked)}
              className="h-4 w-4 rounded border-line text-signal focus:ring-signal/20"
            />
            Mostrar tareas terminadas archivadas
          </label>

          <label className="inline-flex items-center gap-2 text-sm text-carbon">
            <input
              type="checkbox"
              checked={hideAiTasks}
              onChange={(event) => setHideAiTasks(event.target.checked)}
              className="h-4 w-4 rounded border-line text-signal focus:ring-signal/20"
            />
            Ocultar tareas de IA
          </label>
        </div>

        <Badge variant="default">{visibleTareas.length} tareas</Badge>
      </div>

      {loading && tareas.length === 0 ? (
        <div className="text-sm text-graphite">Cargando tareas...</div>
      ) : null}

      <Card padding="lg" className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <TareasKanban
          tareas={visibleTareas}
          proyectos={proyectos}
          usuarios={displayUsuarios}
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
        usuarios={displayUsuarios}
        defaultEstado={initialEstado}
        defaultResponsableId={isAdmin ? undefined : usuario?.id}
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
