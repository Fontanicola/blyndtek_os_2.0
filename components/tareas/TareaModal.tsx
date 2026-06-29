"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, EntitySelect, Input, Modal } from "@/components/ui";
import type { TaskProjectOption, TaskUserOption } from "@/lib/task-support";
import type { EstadoTarea, PrioridadTarea, Tarea, CreateTareaInput } from "@/types/tareas";

type TareaModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: CreateTareaInput) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  tarea?: Tarea | null;
  proyectos: TaskProjectOption[];
  usuarios: TaskUserOption[];
  defaultEstado?: EstadoTarea;
  defaultResponsableId?: string | null;
  defaultProyectoId?: string | null;
};

function buildInitialForm(
  tarea: Tarea | null | undefined,
  defaults: Pick<TareaModalProps, "defaultEstado" | "defaultResponsableId" | "defaultProyectoId">
) {
  if (tarea) {
    return {
      titulo: tarea.titulo,
      proyecto_id: tarea.proyecto_id ?? "",
      responsable_id: tarea.responsable_id,
      prioridad: tarea.prioridad,
      fecha_limite: tarea.fecha_limite ?? "",
      estado: tarea.estado,
      notas: tarea.notas ?? ""
    };
  }

  return {
    titulo: "",
    proyecto_id: defaults.defaultProyectoId ?? "",
    responsable_id: defaults.defaultResponsableId ?? "",
    prioridad: "media" as PrioridadTarea,
    fecha_limite: "",
    estado: defaults.defaultEstado ?? "nueva",
    notas: ""
  };
}

export function TareaModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  tarea,
  proyectos,
  usuarios,
  defaultEstado,
  defaultResponsableId,
  defaultProyectoId
}: TareaModalProps) {
  const initialForm = useMemo(
    () => buildInitialForm(tarea, { defaultEstado, defaultResponsableId, defaultProyectoId }),
    [tarea, defaultEstado, defaultResponsableId, defaultProyectoId]
  );
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(initialForm);
    }
  }, [isOpen, initialForm]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={tarea ? "Editar tarea" : "Nueva tarea"}
      size="lg"
    >
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();

          if (!form.titulo.trim() || !form.responsable_id) {
            return;
          }

          setLoading(true);
          try {
            await onSave({
              titulo: form.titulo.trim(),
              proyecto_id: form.proyecto_id || null,
              responsable_id: form.responsable_id,
              prioridad: form.prioridad,
              fecha_limite: form.fecha_limite || null,
              estado: form.estado,
              notas: form.notas.trim() ? form.notas.trim() : null
            });
            onClose();
          } finally {
            setLoading(false);
          }
        }}
      >
        <Input
          label="Título"
          required
          value={form.titulo}
          onChange={(event) => setForm((current) => ({ ...current, titulo: event.target.value }))}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <EntitySelect
            label="Proyecto"
            value={form.proyecto_id || null}
            allowEmpty
            placeholder="Sin proyecto"
            options={proyectos.map((proyecto) => ({
              id: proyecto.id,
              label: proyecto.nombre,
              sublabel: proyecto.estado.replaceAll("_", " ")
            }))}
            onChange={(id) => setForm((current) => ({ ...current, proyecto_id: id ?? "" }))}
          />

          <EntitySelect
            label="Responsable"
            required
            value={form.responsable_id}
            placeholder="Seleccionar responsable"
            options={usuarios.map((usuario) => ({
              id: usuario.id,
              label: usuario.nombre,
              sublabel: usuario.rol
            }))}
            onChange={(id) => setForm((current) => ({ ...current, responsable_id: id ?? "" }))}
          />

          <div className="space-y-1">
            <label className="block text-sm font-label text-carbon">Prioridad</label>
            <select
              value={form.prioridad}
              onChange={(event) =>
                setForm((current) => ({ ...current, prioridad: event.target.value as PrioridadTarea }))
              }
              className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
            >
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-label text-carbon">Estado</label>
            <select
              value={form.estado}
              onChange={(event) =>
                setForm((current) => ({ ...current, estado: event.target.value as EstadoTarea }))
              }
              className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
            >
              <option value="nueva">Nueva</option>
              <option value="en_proceso">En proceso</option>
              <option value="terminada">Terminada</option>
            </select>
          </div>
        </div>

        <Input
          label="Fecha límite"
          type="date"
          value={form.fecha_limite}
          onChange={(event) => setForm((current) => ({ ...current, fecha_limite: event.target.value }))}
        />

        <div className="space-y-1">
          <label className="block text-sm font-label text-carbon">Notas</label>
          <textarea
            value={form.notas}
            onChange={(event) => setForm((current) => ({ ...current, notas: event.target.value }))}
            className="min-h-[120px] w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon transition-all duration-fast ease-fast focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
          />
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line-soft pt-4">
          <div>
            {onDelete && tarea ? (
              <Button type="button" variant="danger" onClick={onDelete}>
                Eliminar
              </Button>
            ) : null}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Guardar
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
