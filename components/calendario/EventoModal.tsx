"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, EntityMultiSelect, EntitySelect, Input, Modal } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { ConfiguracionRecurrencia, FrecuenciaReunion } from "@/lib/eventos/recurrencia";
import type { TaskClientOption, TaskLeadOption, TaskUserOption } from "@/lib/task-support";
import type { CreateEventoInput, EventoConInvitados, TipoEvento, TipoRelacionEvento, UpdateEventoInput } from "@/types/eventos";

type EventoModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: CreateEventoInput | UpdateEventoInput) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  evento?: EventoConInvitados | null;
  usuarios: TaskUserOption[];
  currentUserId?: string | null;
  defaultDate?: Date;
  readOnly?: boolean;
  onResolveProposal?: (invitacionId: string, accion: "aceptar_nuevo_horario" | "mantener_original") => Promise<void>;
  clientes?: TaskClientOption[];
  leads?: TaskLeadOption[];
  googleCalendarConnected?: boolean;
};

type FormState = {
  titulo: string;
  fecha_inicio: string;
  fecha_fin: string;
  tipo: TipoEvento;
  usuario_id: string;
  invited_user_ids: string[];
  enlace_reunion: string;
  relacion_tipo: TipoRelacionEvento | "";
  relacion_id: string;
  crear_meet: boolean;
  recurrencia: ConfiguracionRecurrencia | null;
};

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function toLocalInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function buildInitialForm(
  evento: EventoConInvitados | null | undefined,
  usuarios: TaskUserOption[],
  defaultDate?: Date,
  currentUserId?: string | null,
  googleCalendarConnected = false
) {
  if (evento) {
    return {
      titulo: evento.titulo,
      fecha_inicio: toLocalInputValue(new Date(evento.fecha_inicio)),
      fecha_fin: toLocalInputValue(new Date(evento.fecha_fin)),
      tipo: evento.tipo,
      usuario_id: evento.usuario_id,
      invited_user_ids: evento.invited_user_ids ?? [],
      enlace_reunion: evento.enlace_reunion ?? "",
      relacion_tipo: evento.relacion_tipo ?? "",
      relacion_id: evento.relacion_id ?? "",
      crear_meet: false,
      recurrencia: null
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
    usuario_id: currentUserId ?? usuarios[0]?.id ?? "",
    invited_user_ids: [],
    enlace_reunion: "",
    relacion_tipo: "",
    relacion_id: "",
    crear_meet: googleCalendarConnected,
    recurrencia: null
  } satisfies FormState;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("es-AR", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

export function EventoModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  evento,
  usuarios,
  currentUserId,
  defaultDate,
  readOnly = false,
  onResolveProposal,
  clientes = [],
  leads = [],
  googleCalendarConnected = false
}: EventoModalProps) {
  const initialForm = useMemo(
    () => buildInitialForm(evento, usuarios, defaultDate, currentUserId, googleCalendarConnected),
    [currentUserId, defaultDate, evento, googleCalendarConnected, usuarios]
  );
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

  const invitedOptions = useMemo(
    () => usuarios.filter((usuario) => usuario.id !== (evento?.usuario_id ?? currentUserId ?? "")),
    [currentUserId, evento?.usuario_id, usuarios]
  );

  const proposals = useMemo(
    () => (evento?.invitaciones ?? []).filter((invitacion) => invitacion.estado === "propuesta_alternativa"),
    [evento?.invitaciones]
  );

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
    <Modal isOpen={isOpen} onClose={onClose} title={evento ? "Evento" : "Nuevo evento"} size="lg">
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
              referencia_id: evento?.referencia_id ?? form.usuario_id,
              invited_user_ids: form.invited_user_ids,
              enlace_reunion: form.enlace_reunion.trim() || null,
              relacion_tipo: form.relacion_tipo || null,
              relacion_id: form.relacion_id || null,
              crear_meet: !evento && form.tipo === "reunion" && !form.recurrencia ? form.crear_meet : false,
              recurrencia: !evento && form.tipo === "reunion" ? form.recurrencia : null
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
          disabled={readOnly}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Fecha inicio"
            type="datetime-local"
            value={form.fecha_inicio}
            onChange={(event) => setForm((current) => ({ ...current, fecha_inicio: event.target.value }))}
            disabled={readOnly}
          />
          <Input
            label="Fecha fin"
            type="datetime-local"
            value={form.fecha_fin}
            onChange={(event) => setForm((current) => ({ ...current, fecha_fin: event.target.value }))}
            disabled={readOnly}
          />
        </div>

        {!evento && form.tipo === "reunion" ? (
          <div className="space-y-3 rounded-component border border-line-soft bg-paper p-3">
            <label className="flex items-center gap-3 text-sm font-label text-carbon">
              <input
                type="checkbox"
                checked={Boolean(form.recurrencia)}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  recurrencia: event.target.checked
                    ? { frecuencia: "semanal", hasta: current.fecha_inicio.slice(0, 10) }
                    : null
                }))}
                disabled={readOnly}
                className="h-4 w-4 accent-signal"
              />
              Repetir reunión
            </label>
            {form.recurrencia ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm font-label text-carbon">
                  Frecuencia
                  <select
                    value={form.recurrencia.frecuencia}
                    onChange={(event) => setForm((current) => ({ ...current, recurrencia: { ...current.recurrencia!, frecuencia: event.target.value as FrecuenciaReunion } }))}
                    className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm font-normal text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
                  >
                    <option value="semanal">Cada semana</option>
                    <option value="quincenal">Cada 2 semanas</option>
                    <option value="mensual">Cada mes</option>
                  </select>
                </label>
                <label className="space-y-1 text-sm font-label text-carbon">
                  Repetir hasta
                  <input
                    type="date"
                    min={form.fecha_inicio.slice(0, 10)}
                    value={form.recurrencia.hasta}
                    onChange={(event) => setForm((current) => ({ ...current, recurrencia: { ...current.recurrencia!, hasta: event.target.value } }))}
                    className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm font-normal text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
                  />
                </label>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-sm font-label text-carbon">Relación opcional</label>
            <select
              value={form.relacion_tipo}
              disabled={readOnly}
              onChange={(event) => setForm((current) => ({
                ...current,
                relacion_tipo: event.target.value as TipoRelacionEvento | "",
                relacion_id: ""
              }))}
              className={cn("w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon", "focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20")}
            >
              <option value="">Sin relación</option>
              <option value="lead">Lead</option>
              <option value="cliente">Cliente</option>
            </select>
          </div>
          {form.relacion_tipo ? (
            <EntitySelect
              label={form.relacion_tipo === "lead" ? "Lead" : "Cliente"}
              value={form.relacion_id || null}
              required
              placeholder={form.relacion_tipo === "lead" ? "Seleccionar lead" : "Seleccionar cliente"}
              options={form.relacion_tipo === "lead"
                ? leads.map((item) => ({ id: item.id, label: item.empresa, sublabel: item.contacto_1_nombre ?? undefined }))
                : clientes.map((item) => ({ id: item.id, label: item.empresa }))}
              onChange={(id) => setForm((current) => ({ ...current, relacion_id: id ?? "" }))}
              disabled={readOnly}
            />
          ) : null}
        </div>

        {!evento && form.tipo === "reunion" ? (
          <label className="flex items-start gap-3 rounded-component border border-line-soft bg-paper p-3 text-sm text-carbon">
            <input
              type="checkbox"
              checked={form.crear_meet}
              onChange={(event) => setForm((current) => ({ ...current, crear_meet: event.target.checked }))}
              disabled={readOnly || !googleCalendarConnected}
              className="mt-0.5 h-4 w-4 accent-signal"
            />
            <span>
              <span className="block font-label">Generar enlace de Google Meet automáticamente</span>
              <span className="mt-0.5 block text-xs text-graphite">
                {googleCalendarConnected ? "Se crea junto con el evento y aparece en la reunión." : "Conectá Google Calendar para habilitar esta opción."}
              </span>
            </span>
          </label>
        ) : null}

        {form.tipo === "reunion" ? (
          <Input
            label="Enlace de la reunión"
            type="url"
            placeholder="https://meet.google.com/..."
            value={form.enlace_reunion}
            onChange={(event) => setForm((current) => ({ ...current, enlace_reunion: event.target.value }))}
            disabled={readOnly || Boolean(evento?.calendly_invitee_uri)}
          />
        ) : null}
        {evento?.calendly_invitee_uri ? <p className="-mt-3 text-xs text-graphite">Enlace recibido desde Calendly.</p> : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-sm font-label text-carbon">Tipo</label>
            <select
              value={form.tipo}
              disabled={readOnly}
              onChange={(event) => setForm((current) => ({ ...current, tipo: event.target.value as TipoEvento }))}
              className={cn(
                "w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon",
                "focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20",
                readOnly && "cursor-not-allowed bg-paper opacity-60"
              )}
            >
              <option value="reunion">Reunión</option>
              <option value="tarea">Tarea</option>
              <option value="seguimiento">Seguimiento</option>
              <option value="vencimiento">Vencimiento</option>
            </select>
          </div>

          <EntitySelect
            label="Organizador"
            value={form.usuario_id}
            required
            placeholder="Seleccionar organizador"
            options={usuarios.map((usuario) => ({
              id: usuario.id,
              label: usuario.nombre,
              sublabel: usuario.rol
            }))}
            onChange={(id) => setForm((current) => ({ ...current, usuario_id: id ?? "" }))}
            disabled={readOnly}
          />
        </div>

        <EntityMultiSelect
          label="Invitar a"
          values={form.invited_user_ids}
          onChange={(ids) => setForm((current) => ({ ...current, invited_user_ids: ids }))}
          options={invitedOptions.map((usuario) => ({
            id: usuario.id,
            label: usuario.nombre,
            sublabel: usuario.rol
          }))}
          placeholder="Sin invitados"
          disabled={readOnly}
          helperText="Seleccioná uno o varios usuarios para enviarles la invitación."
        />

        {proposals.length > 0 && evento && onResolveProposal ? (
          <div className="space-y-3 rounded-card border border-warning/20 bg-warning-light/20 p-4">
            <div className="text-sm font-label text-warning">Propuestas alternativas</div>
            <div className="space-y-3">
              {proposals.map((invitacion) => (
                <div key={invitacion.id} className="rounded-component border border-warning/20 bg-white p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-label text-carbon">{invitacion.usuario_nombre}</div>
                      <div className="text-xs text-graphite">
                        {formatDateTime(invitacion.fecha_propuesta_alt)} · {invitacion.hora_propuesta_alt}
                      </div>
                    </div>
                    {invitacion.comentario ? (
                      <div className="max-w-xs text-xs text-graphite">{invitacion.comentario}</div>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={async () => {
                        await onResolveProposal(invitacion.id, "aceptar_nuevo_horario");
                      }}
                    >
                      Aceptar nuevo horario
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await onResolveProposal(invitacion.id, "mantener_original");
                      }}
                    >
                      Mantener horario original
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {error ? <div className="rounded-card border border-danger bg-danger-light px-4 py-3 text-sm text-danger">{error}</div> : null}

        <div className="flex items-center justify-between gap-3 border-t border-line-soft pt-4">
          <div>{evento && onDelete && !readOnly ? <Button variant="danger" onClick={handleDelete} loading={deleting}>Eliminar</Button> : null}</div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              {readOnly ? "Cerrar" : "Cancelar"}
            </Button>
            {!readOnly ? (
              <Button type="submit" loading={loading}>
                Guardar
              </Button>
            ) : null}
          </div>
        </div>
      </form>
    </Modal>
  );
}
