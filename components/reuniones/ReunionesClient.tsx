"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, EmptyState, Badge, Spinner } from "@/components/ui";
import { CalendarIcon, ClockIcon, LinkIcon, PlusIcon, RefreshIcon, VideoIcon } from "@/components/ui/icons";
import { EventoModal } from "@/components/calendario/EventoModal";
import type { TaskUserOption } from "@/lib/task-support";
import type { EventoConInvitados, UpdateEventoInput } from "@/types/eventos";

type ReunionesClientProps = {
  usuarios: TaskUserOption[];
  currentUserId?: string | null;
};

type Filtro = "proximas" | "todas" | "pasadas";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function getEstado(evento: EventoConInvitados) {
  if (evento.titulo.startsWith("Cancelada")) return "cancelada";
  if (new Date(evento.fecha_fin).getTime() < Date.now()) return "finalizada";
  return "programada";
}

const estadoLabel = { programada: "Programada", finalizada: "Finalizada", cancelada: "Cancelada" } as const;

export function ReunionesClient({ usuarios, currentUserId }: ReunionesClientProps) {
  const [eventos, setEventos] = useState<EventoConInvitados[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("proximas");
  const [selected, setSelected] = useState<EventoConInvitados | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/eventos?tipo=reunion", { cache: "no-store" });
      const payload = (await response.json()) as { data?: EventoConInvitados[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No se pudieron cargar las reuniones.");
      setEventos(payload.data ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las reuniones.");
    } finally {
      setLoading(false);
    }
  }, []);

  const syncAndLoad = useCallback(async () => {
    try {
      const response = await fetch("/api/calendly/sync", { method: "POST" });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "No se pudo sincronizar Calendly.");
      }
    } finally {
      await load();
    }
  }, [load]);

  useEffect(() => { void syncAndLoad(); }, [syncAndLoad]);

  const visible = useMemo(() => eventos.filter((evento) => {
    const estado = getEstado(evento);
    if (filtro === "proximas") return estado === "programada";
    if (filtro === "pasadas") return estado !== "programada";
    return true;
  }), [eventos, filtro]);

  async function openEvent(evento: EventoConInvitados) {
    const response = await fetch(`/api/eventos/${evento.id}`, { cache: "no-store" });
    const payload = (await response.json()) as { data?: EventoConInvitados };
    setSelected(payload.data ?? evento);
    setDetailOpen(true);
  }

  async function saveEvent(input: UpdateEventoInput) {
    if (!selected) return;
    const response = await fetch(`/api/eventos/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });
    const payload = (await response.json()) as { data?: EventoConInvitados; error?: string };
    if (!response.ok) throw new Error(payload.error ?? "No se pudo guardar la reunión.");
    await load();
  }

  async function createEvent(input: UpdateEventoInput) {
    const response = await fetch("/api/eventos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(payload.error ?? "No se pudo crear la reunión.");
    await load();
  }

  async function deleteEvent() {
    if (!selected) return;
    const response = await fetch(`/api/eventos/${selected.id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("No se pudo eliminar la reunión.");
    setDetailOpen(false);
    await load();
  }

  return (
    <div className="w-full space-y-5 px-4 py-5 md:px-6">
      <div className="flex flex-wrap items-center justify-end gap-2 border-b border-line-soft pb-4">
        <Button variant="secondary" size="sm" onClick={() => void syncAndLoad()}>
          <RefreshIcon size={16} /> Actualizar
        </Button>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <PlusIcon size={16} /> Nueva reunión
        </Button>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar reuniones">
        {(["proximas", "todas", "pasadas"] as Filtro[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFiltro(value)}
            className={`rounded-md px-3 py-2 text-sm font-label transition-colors ${filtro === value ? "bg-signal text-white" : "border border-line bg-white text-graphite hover:bg-paper"}`}
          >
            {value === "proximas" ? "Próximas" : value === "todas" ? "Todas" : "Pasadas"}
          </button>
        ))}
      </div>

      {error ? <div className="rounded-md border border-danger/20 bg-danger-light p-3 text-sm text-danger">{error}</div> : null}
      {loading ? (
        <div className="flex min-h-48 items-center justify-center"><Spinner /></div>
      ) : visible.length === 0 ? (
        <EmptyState icon={VideoIcon} titulo={filtro === "proximas" ? "No hay reuniones próximas" : "No hay reuniones para mostrar"} descripcion="Las reservas de Calendly y las reuniones del calendario aparecerán acá." />
      ) : (
        <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visible.map((evento) => {
            const estado = getEstado(evento);
            const isCalendly = Boolean(evento.calendly_invitee_uri || evento.calendly_event_id);
            return (
              <Card key={evento.id} className="group cursor-pointer p-4 transition-colors hover:border-signal/40" onClick={() => void openEvent(evento)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {isCalendly ? <Image src="/Logo_Calendly_New.svg" alt="Calendly" width={76} height={25} className="h-5 w-auto object-contain" /> : <VideoIcon className="text-signal" size={20} />}
                    <Badge variant={estado === "cancelada" ? "danger" : estado === "programada" ? "signal" : "default"}>{estadoLabel[estado]}</Badge>
                  </div>
                  <span className="text-xs text-graphite">{isCalendly ? "Calendly" : "Calendario"}</span>
                </div>
                <h2 className="mt-4 line-clamp-2 text-base font-title text-carbon">{evento.titulo.replace(/^Cancelada · /, "")}</h2>
                <div className="mt-4 space-y-2 text-sm text-graphite">
                  <div className="flex items-center gap-2"><CalendarIcon size={16} /> <span className="capitalize">{formatDate(evento.fecha_inicio)}</span></div>
                  <div className="flex items-center gap-2"><ClockIcon size={16} /> {formatTime(evento.fecha_inicio)} a {formatTime(evento.fecha_fin)}</div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-line-soft pt-3">
                  {evento.enlace_reunion ? <a href={evento.enlace_reunion} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="inline-flex items-center gap-2 text-sm font-label text-signal underline"><LinkIcon size={16} /> Abrir reunión</a> : <span className="text-xs text-graphite">Sin enlace disponible</span>}
                  <span className="text-xs font-label text-signal">Ver detalle</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {selected ? (
        <EventoModal
          isOpen={detailOpen}
          onClose={() => setDetailOpen(false)}
          onSave={saveEvent}
          onDelete={deleteEvent}
          evento={selected}
          usuarios={usuarios}
        />
      ) : null}

      <EventoModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={createEvent}
        evento={null}
        usuarios={usuarios}
        currentUserId={currentUserId}
      />
    </div>
  );
}
