"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, EntitySelect, Input, Modal } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { TaskUserOption } from "@/lib/task-support";
import type { CreateEventoInput, Evento, TipoEvento, UpdateEventoInput } from "@/types/eventos";

type EventoModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: CreateEventoInput | UpdateEventoInput) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  evento?: Evento | null;
  usuarios: TaskUserOption[];
  defaultDate?: Date;
};

type FormState = {
  titulo: string;
  fecha_inicio: string;
  fecha_fin: string;
  tipo: TipoEvento;
  usuario_id: string;
};

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function toLocalInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function buildInitialForm(evento: Evento | null | undefined, usuarios: TaskUserOption[], defaultDate?: Date) {
  if (evento) {
    return {
      titulo: evento.titulo,
      fecha_inicio: toLocalInputValue(new Date(evento.fecha_inicio)),
      fecha_fin: toLocalInputValue(new Date(evento.fecha_fin)),
      tipo: evento.tipo,
      usuario_id: evento.usuario_id
    } satisfies FormState;
  }

  const start = defaultDate ?? new Date();
  start.setMinutes(0, 0, 0);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);

  return {
    titulo: "",
    fecha_inicio: toLocalInputValue(start),
    fecha_fin: toLocalInputValue(end),
    tipo: "reunion" as TipoEvento,
    usuario_id: usuarios[0]?.id ?? ""
  } satisfies FormState;
}

export function EventoModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  evento,
  usuarios,
  defaultDate
}: EventoModalProps) {
  const initialForm = useMemo(() => buildInitialForm(evento, usuarios, defaultDate), [evento, usuarios, defaultDate]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setForm(initialForm);
      setError(null);
      setDeleting(false);
    }
  }, [isOpen, initialForm]);

  async function handleDelete() {
    if (!onDelete) {
      return;
    }

    setError(null);
    setDeleting(true);

    try {
      await onDelete();
      onClose();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el evento.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={evento ? "Editar evento" : "Nuevo evento"} size="lg">
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);

          if (!form.titulo.trim() || !form.fecha_inicio || !form.fecha_fin || !form.usuario_id) {
            return;
          }

          setLoading(true);

          try {
            const payload = {
              titulo: form.titulo.trim(),
              fecha_inicio: new Date(form.fecha_inicio).toISOString(),
              fecha_fin: new Date(form.fecha_fin).toISOString(),
              tipo: form.tipo,
              usuario_id: form.usuario_id,
              referencia_tipo: evento?.referencia_tipo ?? "lead",
              referencia_id: evento?.referencia_id ?? form.usuario_id
            } satisfies CreateEventoInput;

            await onSave(payload);
            onClose();
          } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el evento.");
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
          <Input
            label="Fecha inicio"
            type="datetime-local"
            value={form.fecha_inicio}
            onChange={(event) => setForm((current) => ({ ...current, fecha_inicio: event.target.value }))}
          />
          <Input
            label="Fecha fin"
            type="datetime-local"
            value={form.fecha_fin}
            onChange={(event) => setForm((current) => ({ ...current, fecha_fin: event.target.value }))}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-sm font-label text-carbon">Tipo</label>
            <select
              value={form.tipo}
              onChange={(event) => setForm((current) => ({ ...current, tipo: event.target.value as TipoEvento }))}
              className={cn(
                "w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon",
                "focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
              )}
            >
              <option value="reunion">Reunión</option>
              <option value="tarea">Tarea</option>
              <option value="seguimiento">Seguimiento</option>
              <option value="vencimiento">Vencimiento</option>
            </select>
          </div>

          <EntitySelect
            label="Usuario"
            value={form.usuario_id}
            required
            placeholder="Seleccionar usuario"
            options={usuarios.map((usuario) => ({
              id: usuario.id,
              label: usuario.nombre,
              sublabel: usuario.rol
            }))}
            onChange={(id) => setForm((current) => ({ ...current, usuario_id: id ?? "" }))}
          />
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line-soft pt-4">
          <div>{evento && onDelete ? <Button variant="danger" onClick={handleDelete} loading={deleting}>Eliminar</Button> : null}</div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Guardar
            </Button>
          </div>
        </div>

        {error ? <div className="rounded-card border border-danger bg-danger-light px-4 py-3 text-sm text-danger">{error}</div> : null}
      </form>
    </Modal>
  );
}
