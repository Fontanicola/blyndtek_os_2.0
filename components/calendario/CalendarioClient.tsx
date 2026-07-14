"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Input, Modal, Toast } from "@/components/ui";
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
import type { CreateEventoInput, EventoConInvitados, UpdateEventoInput } from "@/types/eventos";
import type { InvitacionPendienteEvento } from "@/types/eventosInvitados";

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
  const [selectedEvent, setSelectedEvent] = useState<EventoConInvitados | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [defaultDate, setDefaultDate] = useState<Date>(new Date());
  const [syncing, setSyncing] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<InvitacionPendienteEvento[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(true);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [proposalTarget, setProposalTarget] = useState<InvitacionPendienteEvento | null>(null);
  const [proposalDate, setProposalDate] = useState("");
  const [proposalTime, setProposalTime] = useState("");
  const [proposalComment, setProposalComment] = useState("");
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

  const fetchPendingInvitations = useCallback(async () => {
    setLoadingInvitations(true);

    try {
      const response = await fetch("/api/eventos-invitados");
      const payload = (await response.json()) as { data?: InvitacionPendienteEvento[]; error?: string };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudieron cargar las invitaciones.");
      }

      setPendingInvitations(payload.data);
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "No se pudieron cargar las invitaciones.",
        type: "error",
        visible: true
      });
    } finally {
      setLoadingInvitations(false);
    }
  }, []);

  useEffect(() => {
    void fetchCalendarItems();
  }, [fetchCalendarItems]);

  useEffect(() => {
    void fetchPendingInvitations();
  }, [fetchPendingInvitations]);

  useEffect(() => {
    function handleRefresh() {
      void fetchCalendarItems();
      void fetchPendingInvitations();
    }

    window.addEventListener(EVENTOS_REFRESH_EVENT_NAME, handleRefresh);
    return () => window.removeEventListener(EVENTOS_REFRESH_EVENT_NAME, handleRefresh);
  }, [fetchCalendarItems, fetchPendingInvitations]);

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

  async function handleRespondInvitation(
    invitationId: string,
    payload: { estado: "aceptado" | "rechazado" }
  ) {
    const response = await fetch(`/api/eventos-invitados/${invitationId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      throw new Error(data.error ?? "No se pudo responder la invitación.");
    }

    setToast({
      message: payload.estado === "aceptado" ? "Invitación aceptada." : "Invitación rechazada.",
      type: "success",
      visible: true
    });
    void fetchCalendarItems();
    void fetchPendingInvitations();
  }

  async function handleSendProposal() {
    if (!proposalTarget || !proposalDate || !proposalTime) {
      return;
    }

    const response = await fetch(`/api/eventos-invitados/${proposalTarget.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        estado: "propuesta_alternativa",
        fecha_propuesta_alt: proposalDate,
        hora_propuesta_alt: proposalTime,
        comentario: proposalComment
      })
    });

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      throw new Error(data.error ?? "No se pudo guardar la propuesta.");
    }

    setProposalOpen(false);
    setProposalTarget(null);
    setProposalDate("");
    setProposalTime("");
    setProposalComment("");
    setToast({
      message: "Propuesta enviada.",
      type: "success",
      visible: true
    });
    void fetchCalendarItems();
    void fetchPendingInvitations();
  }

  async function handleResolveProposal(
    invitacionId: string,
    accion: "aceptar_nuevo_horario" | "mantener_original"
  ) {
    if (!selectedEvent) {
      return;
    }

    const response = await fetch(`/api/eventos/${selectedEvent.id}/invitados/${invitacionId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ accion })
    });
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      throw new Error(data.error ?? "No se pudo resolver la propuesta.");
    }

    setToast({
      message: accion === "aceptar_nuevo_horario" ? "Nuevo horario aceptado." : "Horario original mantenido.",
      type: "success",
      visible: true
    });
    void fetchCalendarItems();
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

      <div className="flex justify-end">
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

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="signal">Tarea</Badge>
        <Badge variant="warning">Seguimiento</Badge>
        <Badge variant="danger">Vencimiento</Badge>
        <Badge variant="success">Reunión</Badge>
        {canSyncGoogle ? <Badge variant="success">Google conectado</Badge> : null}
      </div>

      {loadingInvitations ? <div className="text-sm text-graphite">Cargando invitaciones...</div> : null}

      {pendingInvitations.length > 0 ? (
        <Card padding="md" className="space-y-4 border border-warning/20 bg-warning-light/20">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-title text-carbon">Invitaciones pendientes</div>
              <div className="text-xs text-graphite">
                Tenés {pendingInvitations.length} evento{pendingInvitations.length === 1 ? "" : "s"} por responder.
              </div>
            </div>
            <Badge variant="warning">{pendingInvitations.length}</Badge>
          </div>

          <div className="space-y-3">
            {pendingInvitations.map((invitacion) => (
              <div key={invitacion.id} className="rounded-card border border-line-soft bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-title text-carbon">{invitacion.evento_titulo}</div>
                    <div className="text-xs text-graphite">
                      {new Date(invitacion.evento_fecha_inicio).toLocaleString("es-AR", {
                        dateStyle: "medium",
                        timeStyle: "short"
                      })}
                    </div>
                    <div className="mt-1 text-xs text-graphite">Organizador: {invitacion.organizador_nombre}</div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={async () => {
                        try {
                          await handleRespondInvitation(invitacion.id, { estado: "aceptado" });
                        } catch (error) {
                          setToast({
                            message: error instanceof Error ? error.message : "No se pudo aceptar la invitación.",
                            type: "error",
                            visible: true
                          });
                        }
                      }}
                    >
                      Aceptar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        try {
                          await handleRespondInvitation(invitacion.id, { estado: "rechazado" });
                        } catch (error) {
                          setToast({
                            message: error instanceof Error ? error.message : "No se pudo rechazar la invitación.",
                            type: "error",
                            visible: true
                          });
                        }
                      }}
                    >
                      Rechazar
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setProposalTarget(invitacion);
                        setProposalDate("");
                        setProposalTime("");
                        setProposalComment("");
                        setProposalOpen(true);
                      }}
                    >
                      Proponer otro horario
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

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
        currentUserId={usuario?.id}
        defaultDate={defaultDate}
        onSave={handleSaveEvent}
        onDelete={selectedEvent ? handleDeleteEvent : undefined}
        readOnly={Boolean(selectedEvent && usuario && usuario.rol !== "admin" && selectedEvent.usuario_id !== usuario.id)}
        onResolveProposal={async (invitacionId, accion) => {
          try {
            await handleResolveProposal(invitacionId, accion);
          } catch (error) {
            setToast({
              message: error instanceof Error ? error.message : "No se pudo resolver la propuesta.",
              type: "error",
              visible: true
            });
          }
        }}
      />

      <Modal
        isOpen={proposalOpen}
        onClose={() => {
          setProposalOpen(false);
          setProposalTarget(null);
        }}
        title="Proponer otro horario"
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-card border border-line-soft bg-paper px-4 py-3 text-sm text-carbon">
            {proposalTarget ? proposalTarget.evento_titulo : "Seleccioná una invitación."}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Fecha"
              type="date"
              value={proposalDate}
              onChange={(event) => setProposalDate(event.target.value)}
            />
            <Input
              label="Hora"
              type="time"
              value={proposalTime}
              onChange={(event) => setProposalTime(event.target.value)}
            />
          </div>

          <Input
            label="Comentario"
            value={proposalComment}
            onChange={(event) => setProposalComment(event.target.value)}
            placeholder="Opcional"
          />

          <div className="flex items-center justify-end gap-2 border-t border-line-soft pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setProposalOpen(false);
                setProposalTarget(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                try {
                  await handleSendProposal();
                } catch (error) {
                  setToast({
                    message: error instanceof Error ? error.message : "No se pudo guardar la propuesta.",
                    type: "error",
                    visible: true
                  });
                }
              }}
            >
              Enviar propuesta
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
