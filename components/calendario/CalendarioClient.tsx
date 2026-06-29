"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Toast } from "@/components/ui";
import { EVENTOS_REFRESH_EVENT_NAME, useEventos } from "@/lib/hooks/useEventos";
import {
  addDays,
  addMonths,
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek
} from "@/lib/calendario";
import type { CalendarItem, CalendarViewMode } from "@/types/calendario";
import type { TaskUserOption } from "@/lib/task-support";
import type { Usuario } from "@/types/auth";
import { CalendarioControls } from "./CalendarioControls";
import { CalendarioDia } from "./CalendarioDia";
import { CalendarioMes } from "./CalendarioMes";
import { CalendarioSemana } from "./CalendarioSemana";
import { EventoModal } from "./EventoModal";
import type { CreateEventoInput, Evento, UpdateEventoInput } from "@/types/eventos";

type CalendarioClientProps = {
  usuario: Usuario | null;
  usuarios: TaskUserOption[];
};

type ToastState = {
  message: string;
  type: "success" | "info" | "warning" | "error";
  visible: boolean;
};

function getRange(date: Date, mode: CalendarViewMode) {
  if (mode === "week") {
    return {
      desde: startOfWeek(date),
      hasta: endOfWeek(date)
    };
  }

  if (mode === "day") {
    return {
      desde: startOfDay(date),
      hasta: endOfDay(date)
    };
  }

  return {
    desde: startOfMonth(date),
    hasta: endOfMonth(date)
  };
}

export function CalendarioClient({ usuario, usuarios }: CalendarioClientProps) {
  const { createEvento, updateEvento, deleteEvento, fetchEvento } = useEventos();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Evento | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [defaultDate, setDefaultDate] = useState<Date>(new Date());
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<ToastState>({
    message: "",
    type: "info",
    visible: false
  });

  const range = useMemo(() => getRange(currentDate, viewMode), [currentDate, viewMode]);

  const fetchCalendarItems = useCallback(async () => {
    setLoadingCalendar(true);

    try {
      const searchParams = new URLSearchParams({
        desde: range.desde.toISOString(),
        hasta: range.hasta.toISOString()
      });

      const response = await fetch(`/api/calendario?${searchParams.toString()}`);
      const payload = (await response.json()) as { data?: CalendarItem[]; error?: string };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo cargar el calendario.");
      }

      setCalendarItems(payload.data);
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "No se pudo cargar el calendario.",
        type: "error",
        visible: true
      });
    } finally {
      setLoadingCalendar(false);
    }
  }, [range.hasta, range.desde]);

  useEffect(() => {
    void fetchCalendarItems();
  }, [fetchCalendarItems]);

  useEffect(() => {
    function handleRefresh() {
      void fetchCalendarItems();
    }

    window.addEventListener(EVENTOS_REFRESH_EVENT_NAME, handleRefresh);
    return () => window.removeEventListener(EVENTOS_REFRESH_EVENT_NAME, handleRefresh);
  }, [fetchCalendarItems]);

  async function handleGoogleSync() {
    setSyncing(true);

    try {
      const response = await fetch("/api/calendario/sync", { method: "POST" });
      const payload = (await response.json()) as { data?: { pushed: number; pulled: number }; error?: string };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo sincronizar el calendario.");
      }

      setToast({
        message: `Sincronización completa: ${payload.data.pushed} enviados, ${payload.data.pulled} recibidos.`,
        type: "success",
        visible: true
      });
      void fetchCalendarItems();
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "No se pudo sincronizar el calendario.",
        type: "error",
        visible: true
      });
    } finally {
      setSyncing(false);
    }
  }

  async function handleOpenEvento(item: CalendarItem) {
    if (item.source !== "evento") {
      return;
    }

    try {
      const evento = await fetchEvento(item.id);
      setSelectedEvent(evento);
      setDefaultDate(new Date(evento.fecha_inicio));
      setModalOpen(true);
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "No se pudo abrir el evento.",
        type: "error",
        visible: true
      });
    }
  }

  async function handleSaveEvent(input: CreateEventoInput | UpdateEventoInput) {
    if (selectedEvent) {
      await updateEvento(selectedEvent.id, input);
      return;
    }

    await createEvento(input as CreateEventoInput);
  }

  async function handleDeleteEvent() {
    if (!selectedEvent) {
      return;
    }

    await deleteEvento(selectedEvent.id);
    setModalOpen(false);
    setSelectedEvent(null);
  }

  const canSyncGoogle = Boolean(usuario?.google_calendar_token);

  return (
    <div className="space-y-6">
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={() => setToast((current) => ({ ...current, visible: false }))}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-title text-carbon">Calendario</h1>
          <p className="mt-1 text-sm text-graphite">
            Agenda unificada con eventos locales, tareas y recordatorios de leads.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canSyncGoogle ? (
            <Button variant="secondary" size="sm" onClick={handleGoogleSync} loading={syncing}>
              Sincronizar ahora
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                window.location.href = "/api/auth/google";
              }}
            >
              Conectar Google Calendar
            </Button>
          )}
        </div>
      </div>

      <CalendarioControls
        mode={viewMode}
        currentDate={currentDate}
        onModeChange={setViewMode}
        onPrevious={() => {
          setCurrentDate((current) => {
            if (viewMode === "week") {
              return addDays(current, -7);
            }

            if (viewMode === "day") {
              return addDays(current, -1);
            }

            return addMonths(current, -1);
          });
        }}
        onNext={() => {
          setCurrentDate((current) => {
            if (viewMode === "week") {
              return addDays(current, 7);
            }

            if (viewMode === "day") {
              return addDays(current, 1);
            }

            return addMonths(current, 1);
          });
        }}
        onToday={() => setCurrentDate(new Date())}
        onNewEvent={() => {
          setSelectedEvent(null);
          setDefaultDate(new Date(currentDate));
          setModalOpen(true);
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="signal">Tarea</Badge>
        <Badge variant="warning">Seguimiento</Badge>
        <Badge variant="danger">Vencimiento</Badge>
        <Badge variant="success">Reunión</Badge>
        {canSyncGoogle ? <Badge variant="success">Google conectado</Badge> : null}
      </div>

      {loadingCalendar ? <div className="text-sm text-graphite">Cargando calendario...</div> : null}

      {viewMode === "month" ? (
        <CalendarioMes
          currentDate={currentDate}
          items={calendarItems}
          onEventClick={handleOpenEvento}
        />
      ) : null}

      {viewMode === "week" ? (
        <CalendarioSemana
          currentDate={currentDate}
          items={calendarItems}
          onEventClick={handleOpenEvento}
        />
      ) : null}

      {viewMode === "day" ? (
        <CalendarioDia
          currentDate={currentDate}
          items={calendarItems}
          onEventClick={handleOpenEvento}
        />
      ) : null}

      <Card padding="md" className="space-y-2">
        <div className="text-sm font-label text-carbon">Fuentes del calendario</div>
        <div className="text-sm text-graphite">
          Eventos locales, tareas con fecha límite y recordatorios pendientes de seguimiento se unifican en esta
          vista.
        </div>
      </Card>

      <EventoModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedEvent(null);
        }}
        evento={selectedEvent}
        usuarios={usuarios}
        defaultDate={defaultDate}
        onSave={handleSaveEvent}
        onDelete={selectedEvent ? handleDeleteEvent : undefined}
      />
    </div>
  );
}
