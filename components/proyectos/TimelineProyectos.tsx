"use client";

import { useEffect, useMemo, useState } from "react";
import { FileTextIcon, VideoIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { buildRecurrenceOccurrences, type FrecuenciaReunion } from "@/lib/eventos/recurrencia";
import type { Evento } from "@/types/eventos";
import type { Cobro } from "@/types/cobros";
import type { Nota } from "@/types/notas";
import type { Proyecto } from "@/types/proyectos";

type TimelineProyectosProps = {
  proyectos: Proyecto[];
  clientes: Array<Pick<{ id: string; empresa: string }, "id" | "empresa">>;
  currentUserId?: string | null;
  onSelectProject: (id: string) => void;
  onUpdateProject: (id: string, input: { fecha_inicio?: string | null; entrega_comprometida?: string | null }) => Promise<Proyecto>;
};

type TimelineEvent = {
  id: string;
  proyectoId: string;
  clientId?: string | null;
  week: number;
  type: "pago" | "reunion" | "nota";
  label: string;
  amount?: number;
  date?: string;
  priority?: "alta" | "media" | "baja";
  noteText?: string;
};

const WEEKS_PER_MONTH = 4;
const TOTAL_MONTHS = 12;
const TOTAL_WEEKS = WEEKS_PER_MONTH * TOTAL_MONTHS;
const TOTAL_DAYS = TOTAL_WEEKS * 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_PERCENT = 100 / TOTAL_WEEKS;
const weeks = Array.from({ length: TOTAL_WEEKS }, (_, index) => index);
function getClientName(id: string, clients: TimelineProyectosProps["clientes"]) {
  return clients.find((client) => client.id === id)?.empresa ?? "Cliente";
}

function formatMoney(value: number) {
  return `$ ${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(value)}`;
}

function formatEventDate(value: Date | string) {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" }).format(new Date(value)).replace(".", "");
}

function toDateInputValue(date: Date) {
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatTimelineDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function getNoteText(content: unknown) {
  if (!content || typeof content !== "object") return "";
  const blocks = (content as { content?: unknown[] }).content;
  if (!Array.isArray(blocks)) return "";
  return blocks.map((block) => {
    if (!block || typeof block !== "object") return "";
    const parts = (block as { content?: unknown[] }).content;
    if (!Array.isArray(parts)) return "";
    return parts.map((part) => (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string" ? (part as { text: string }).text : "")).join("");
  }).filter(Boolean).join("\n");
}

function getTimelineNotePriority(note: Nota) {
  const tag = note.tags?.find((item) => item.startsWith("timeline-prioridad:"));
  const priority = tag?.split(":")[1];
  return priority === "alta" || priority === "media" || priority === "baja" ? priority : "media";
}

function getTimelineNoteWeek(note: Nota) {
  const tag = note.tags?.find((item) => item.startsWith("timeline-semana:"));
  const week = Number(tag?.split(":")[1]);
  return Number.isInteger(week) ? Math.max(0, Math.min(TOTAL_WEEKS - 1, week)) : null;
}

function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function parseProjectDate(value: string) {
  return new Date(value.length === 10 ? `${value}T10:00:00` : value);
}

function getTimelinePercent(value: Date, timelineStart: Date) {
  return Math.max(0, Math.min(100, ((value.getTime() - timelineStart.getTime()) / (TOTAL_DAYS * DAY_MS)) * 100));
}

function getWeekIndex(value: string | Date, timelineStart: Date) {
  const date = typeof value === "string" && value.length === 10 ? parseProjectDate(value) : new Date(value);
  return Math.max(0, Math.min(TOTAL_WEEKS - 1, Math.floor((date.getTime() - timelineStart.getTime()) / (7 * 24 * 60 * 60 * 1000))));
}

function projectPosition(project: Proyecto, timelineStart: Date, dateOffsetWeeks = 0, resizeOffsetWeeks = 0) {
  const hasSchedule = Boolean(project.fecha_inicio && project.entrega_comprometida);
  const originalStartDate = hasSchedule ? parseProjectDate(project.fecha_inicio as string) : timelineStart;
  const originalEndDate = hasSchedule ? parseProjectDate(project.entrega_comprometida as string) : timelineStart;
  const startDate = addDays(originalStartDate, dateOffsetWeeks * 7);
  const endDate = addDays(originalEndDate, (dateOffsetWeeks + resizeOffsetWeeks) * 7);
  const startPercent = getTimelinePercent(startDate, timelineStart);
  const endPercent = Math.max(startPercent + (100 / TOTAL_DAYS), getTimelinePercent(endDate, timelineStart));
  const widthPercent = hasSchedule ? Math.min(100 - startPercent, endPercent - startPercent) : 0;
  const now = Date.now();
  const totalDuration = endDate.getTime() - startDate.getTime();
  const progressPct = hasSchedule && totalDuration > 0
    ? Math.max(0, Math.min(100, ((now - startDate.getTime()) / totalDuration) * 100))
    : 0;
  const daysRemaining = (endDate.getTime() - now) / (24 * 60 * 60 * 1000);
  const remainingClass = !hasSchedule
    ? "border-slate-200 bg-slate-100"
    : daysRemaining < 0
      ? "border-slate-300 bg-slate-200"
      : daysRemaining >= 30
        ? "border-emerald-200 bg-emerald-100"
        : daysRemaining > 14
          ? "border-orange-200 bg-orange-100"
          : "border-red-200 bg-red-100";

  return { startPercent, widthPercent, progressPct, remainingClass, startDate, endDate, hasSchedule };
}

function getWeekDate(week: number, timelineStart: Date) {
  const date = new Date(timelineStart);
  date.setDate(date.getDate() + week * 7 + 1);
  date.setHours(10, 0, 0, 0);
  return date;
}

export function TimelineProyectos({ proyectos, clientes, currentUserId, onSelectProject, onUpdateProject }: TimelineProyectosProps) {
  const timelineStart = useMemo(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }, []);
  const months = useMemo(() => Array.from({ length: TOTAL_MONTHS }, (_, index) => {
    const date = new Date(timelineStart.getFullYear(), timelineStart.getMonth() + index, 1);
    return new Intl.DateTimeFormat("es-AR", { month: "long" }).format(date);
  }), [timelineStart]);
  const currentWeek = getWeekIndex(new Date(), timelineStart);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [activeCell, setActiveCell] = useState<{ proyectoId: string; clientId: string; week: number } | null>(null);
  const [eventLabel, setEventLabel] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("10:00");
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<FrecuenciaReunion | null>(null);
  const [recurrenceUntil, setRecurrenceUntil] = useState("");
  const [eventSaving, setEventSaving] = useState(false);
  const [eventError, setEventError] = useState<string | null>(null);
  const [activeNote, setActiveNote] = useState<{ proyectoId: string; clientId: string; week: number } | null>(null);
  const [noteText, setNoteText] = useState("");
  const [notePriority, setNotePriority] = useState<"alta" | "media" | "baja">("media");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [scheduleDrag, setScheduleDrag] = useState<{ projectId: string; mode: "move" | "resize"; originX: number; deltaWeeks: number } | null>(null);
  const [scheduleSaving, setScheduleSaving] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTimelineEvents() {
      try {
        const [meetingsResponse, cobrosResponse, notesResponse] = await Promise.all([
          fetch("/api/eventos?tipo=reunion", { cache: "no-store" }),
          fetch("/api/cobros", { cache: "no-store" }),
          fetch("/api/notas?papelera=false", { cache: "no-store" })
        ]);
        const meetingsPayload = (await meetingsResponse.json()) as { data?: Evento[] };
        const cobrosPayload = (await cobrosResponse.json()) as { data?: Cobro[] };
        const notesPayload = (await notesResponse.json()) as { data?: Nota[] };
        if (cancelled) return;

        const cobros = (cobrosPayload.data ?? []).map((cobro) => ({
          id: cobro.id,
          proyectoId: cobro.proyecto_id ?? "",
          clientId: cobro.cliente_id,
          week: getWeekIndex(cobro.fecha_vencimiento, timelineStart),
          type: "pago" as const,
          label: cobro.concepto,
          amount: cobro.monto,
          date: cobro.fecha_vencimiento
        }));
        const notes = (notesPayload.data ?? []).map((note) => {
          const week = getTimelineNoteWeek(note);
          if (!note.proyecto_id || week === null) return null;
          return {
            id: note.id,
            proyectoId: note.proyecto_id,
            clientId: note.cliente_id,
            week,
            type: "nota" as const,
            label: note.titulo,
            priority: getTimelineNotePriority(note),
            noteText: getNoteText(note.contenido)
          };
        }).filter((note) => note !== null) as TimelineEvent[];
        setEvents([...cobros, ...notes, ...(meetingsPayload.data ?? []).map((meeting) => ({
          id: meeting.id,
          proyectoId: "",
          clientId: meeting.relacion_id,
          week: getWeekIndex(meeting.fecha_inicio, timelineStart),
          type: "reunion" as const,
          label: meeting.titulo.replace(/^Cancelada · /, ""),
          date: meeting.fecha_inicio
        }))]);
      } catch {
        // El timeline queda vacío si las fuentes reales no están disponibles.
      }
    }

    void loadTimelineEvents();
    return () => { cancelled = true; };
  }, [timelineStart]);

  const displayProjects = useMemo(() => proyectos.slice(0, 8), [proyectos]);
  const projectRows = displayProjects.length > 0 ? displayProjects : [
    { id: "funes", nombre: "Implementación web", cliente_id: "funes", estado: "en_desarrollo", fecha_inicio: null, entrega_comprometida: null, avance_pct: 38 } as Proyecto,
    { id: "ha", nombre: "Sistema interno", cliente_id: "ha", estado: "implementacion", fecha_inicio: null, entrega_comprometida: null, avance_pct: 61 } as Proyecto,
    { id: "abc", nombre: "Automatización", cliente_id: "abc", estado: "por_empezar", fecha_inicio: null, entrega_comprometida: null, avance_pct: 18 } as Proyecto
  ];

  function openCell(project: Proyecto, week: number) {
    setActiveCell({ proyectoId: project.id, clientId: project.cliente_id, week });
    setEventLabel("");
    setEventDate(toDateInputValue(getWeekDate(week, timelineStart)));
    setEventTime("10:00");
    setRecurrenceFrequency(null);
    setRecurrenceUntil(toDateInputValue(getWeekDate(week, timelineStart)));
    setEventError(null);
  }

  function openNote(project: Proyecto, week: number) {
    setActiveNote({ proyectoId: project.id, clientId: project.cliente_id, week });
    setNoteText("");
    setNotePriority("media");
    setNoteError(null);
  }

  async function saveNote() {
    if (!activeNote || !noteText.trim() || noteSaving) return;
    setNoteSaving(true);
    setNoteError(null);
    try {
      const response = await fetch("/api/notas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: (noteText.trim().split("\n")[0] ?? "Nota").slice(0, 80),
          contenido: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: noteText.trim() }] }] },
          proyecto_id: activeNote.proyectoId,
          cliente_id: activeNote.clientId,
          tags: [`timeline-prioridad:${notePriority}`, `timeline-semana:${activeNote.week}`]
        })
      });
      const payload = (await response.json()) as { data?: Nota; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error ?? "No se pudo guardar la nota.");
      setEvents((current) => [...current, { id: payload.data!.id, ...activeNote, type: "nota", label: payload.data!.titulo, priority: notePriority, noteText: noteText.trim() }]);
      setActiveNote(null);
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : "No se pudo guardar la nota.");
    } finally {
      setNoteSaving(false);
    }
  }

  async function saveEvent() {
    if (!activeCell || eventSaving) return;
    const label = eventLabel.trim() || "Reunión";
    const date = eventDate ? new Date(`${eventDate}T${eventTime || "10:00"}:00`) : getWeekDate(activeCell.week, timelineStart);

    setEventSaving(true);
    setEventError(null);
    try {
      const end = new Date(date);
      end.setHours(end.getHours() + 1);
      const occurrences = buildRecurrenceOccurrences(
        date.toISOString(),
        end.toISOString(),
        recurrenceFrequency && recurrenceUntil ? { frecuencia: recurrenceFrequency, hasta: recurrenceUntil } : null
      );
      const createdMeetings: TimelineEvent[] = [];
      for (const occurrence of occurrences) {
        const response = await fetch("/api/eventos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titulo: label,
            ...occurrence,
            tipo: "reunion",
            usuario_id: currentUserId ?? undefined,
            relacion_tipo: activeCell.clientId ? "cliente" : null,
            relacion_id: activeCell.clientId || null,
            crear_meet: false
          })
        });
        const payload = (await response.json()) as { data?: Evento; error?: string };
        if (!response.ok || !payload.data) throw new Error(payload.error ?? "No se pudo crear la reunión.");
        createdMeetings.push({ id: payload.data.id, ...activeCell, type: "reunion", label, date: payload.data.fecha_inicio });
      }
      setEvents((current) => [...current, ...createdMeetings]);
      setActiveCell(null);
    } catch (error) {
      setEventError(error instanceof Error ? error.message : "No se pudo crear la reunión.");
    } finally {
      setEventSaving(false);
    }
  }

  function beginScheduleDrag(event: React.PointerEvent<HTMLElement>, project: Proyecto, mode: "move" | "resize") {
    if (!project.fecha_inicio || !project.entrega_comprometida || scheduleSaving) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setScheduleError(null);
    setScheduleDrag({ projectId: project.id, mode, originX: event.clientX, deltaWeeks: 0 });
  }

  function updateScheduleDrag(event: React.PointerEvent<HTMLElement>) {
    if (!scheduleDrag) return;
    const rawDelta = Math.round((event.clientX - scheduleDrag.originX) / (72 / 7));
    const project = projectRows.find((item) => item.id === scheduleDrag.projectId);
    if (!project || !project.fecha_inicio || !project.entrega_comprometida) return;
    const startDay = Math.floor((parseProjectDate(project.fecha_inicio).getTime() - timelineStart.getTime()) / DAY_MS);
    const endDay = Math.floor((parseProjectDate(project.entrega_comprometida).getTime() - timelineStart.getTime()) / DAY_MS);
    const deltaWeeks = scheduleDrag.mode === "move"
      ? Math.max(-startDay, Math.min(TOTAL_DAYS - 1 - endDay, rawDelta))
      : Math.max(startDay + 1 - endDay, Math.min(TOTAL_DAYS - endDay, rawDelta));
    setScheduleDrag((current) => current ? { ...current, deltaWeeks } : null);
  }

  async function finishScheduleDrag(event: React.PointerEvent<HTMLElement>, project: Proyecto) {
    if (!scheduleDrag || scheduleDrag.projectId !== project.id) return;
    event.stopPropagation();
    event.currentTarget.releasePointerCapture(event.pointerId);
    const { mode, deltaWeeks } = scheduleDrag;
    setScheduleDrag(null);
    if (deltaWeeks === 0 || !project.fecha_inicio || !project.entrega_comprometida) return;

    const startDate = parseProjectDate(project.fecha_inicio);
    const endDate = parseProjectDate(project.entrega_comprometida);
    const nextStart = mode === "move" ? addDays(startDate, deltaWeeks) : startDate;
    const nextEnd = addDays(endDate, deltaWeeks);
    setScheduleSaving(project.id);
    setScheduleError(null);
    try {
      await onUpdateProject(project.id, {
        ...(mode === "move" ? { fecha_inicio: toDateInputValue(nextStart) } : {}),
        entrega_comprometida: toDateInputValue(nextEnd)
      });
    } catch (error) {
      setScheduleError(error instanceof Error ? error.message : "No se pudo actualizar el cronograma.");
    } finally {
      setScheduleSaving(null);
    }
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-card border border-line-soft bg-white shadow-card">
      <div className="overflow-x-auto overscroll-x-contain pb-3">
        <div className="min-w-[3716px]">
          <div className="grid grid-cols-[260px_repeat(48,minmax(72px,1fr))]">
            <div className="sticky left-0 z-20 flex h-14 items-center border-b-2 border-r-2 border-line bg-white px-3 text-[11px] font-label uppercase tracking-wider text-graphite">Proyecto</div>
            {months.map((month, index) => <div key={month} className={cn("flex h-14 items-center justify-center border-b-2 border-line px-2 text-center text-xs font-title capitalize text-carbon", index > 0 && "border-l")} style={{ gridColumn: `span ${WEEKS_PER_MONTH}` }}>{month}</div>)}
            <div className="sticky left-0 z-20 flex h-12 items-center border-b-2 border-r-2 border-line bg-white px-3 text-[11px] text-graphite">Semanas</div>
            {weeks.map((week) => <div key={week} className={cn("relative flex h-12 items-center justify-center border-b-2 border-line text-[10px] text-graphite", week !== 0 && "border-l", week % WEEKS_PER_MONTH === 0 && week !== 0 && "border-l-slate-300", week === currentWeek && "bg-signal-light/50 font-title text-signal")}><span>{(week % WEEKS_PER_MONTH) + 1}</span>{week === currentWeek ? <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-signal" title="Semana actual" /> : null}</div>)}

            {projectRows.map((project, index) => {
              const dragOffset = scheduleDrag?.projectId === project.id && scheduleDrag.mode === "move" ? scheduleDrag.deltaWeeks : 0;
              const resizeOffset = scheduleDrag?.projectId === project.id && scheduleDrag.mode === "resize" ? scheduleDrag.deltaWeeks : 0;
              const position = projectPosition(project, timelineStart, dragOffset / 7, resizeOffset / 7);
              const resolvedClientName = getClientName(project.cliente_id, clientes);
              const clientName = resolvedClientName === "Cliente" ? ["Funes", "HA", "ABC"][index] ?? "Cliente" : resolvedClientName;
              const alias = ["funes", "ha", "abc"][index];
              const projectEvents = events.filter((event) => event.proyectoId === project.id || event.proyectoId === alias || (!event.proyectoId && event.clientId === project.cliente_id));
              return <div key={project.id} className="contents">
                <div className="sticky left-0 z-10 grid h-[224px] grid-cols-[minmax(0,1fr)_48px] grid-rows-[56px_56px_56px_56px] border-b-2 border-r-2 border-line bg-white">
                  <button type="button" onClick={() => onSelectProject(project.id)} className="group row-span-4 flex min-w-0 flex-col justify-center px-3 text-left hover:bg-paper"><span className="text-sm font-title text-carbon group-hover:text-signal">{clientName}</span><span className="mt-1 truncate text-xs text-graphite">{project.nombre}</span><span className="mt-2 flex items-center gap-1.5 text-[10px] text-graphite"><span className="h-1.5 w-1.5 rounded-full bg-signal" />{project.avance_pct ?? 0}% avance</span></button>
                  <div className="row-span-4 grid grid-rows-[56px_56px_56px_56px] border-l border-line text-graphite"><span className="flex items-center justify-center border-b border-line-soft text-sm" title="Duración">■</span><span className="flex items-center justify-center border-b border-line-soft text-base" title="Hitos de pago">$</span><span className="flex items-center justify-center border-b border-line-soft text-base" title="Reuniones"><VideoIcon size={18} /></span><span className="flex items-center justify-center text-base" title="Notas"><FileTextIcon size={18} /></span></div>
                </div>
                <div className="relative h-[224px] border-b-2 border-line" style={{ gridColumn: `2 / span ${TOTAL_WEEKS}` }}>
                  {weeks.map((week) => <button key={`${project.id}-${week}`} type="button" onClick={() => openCell(project, week)} aria-label={`Agregar evento en semana ${week + 1}`} className={cn("absolute top-0 h-full border-l border-line-soft/70 hover:bg-signal-light/30", week === 0 && "border-l-0", week === currentWeek && "bg-signal-light/20")} style={{ left: `${week * WEEK_PERCENT}%`, width: `${WEEK_PERCENT}%` }} />)}
                  {weeks.map((week) => <button key={`${project.id}-note-${week}`} type="button" onClick={() => openNote(project, week)} aria-label={`Agregar nota en semana ${week + 1}`} className="absolute top-[168px] z-10 h-14 border-l border-line-soft/70 hover:bg-signal-light/20" style={{ left: `${week * WEEK_PERCENT}%`, width: `${WEEK_PERCENT}%` }} />)}
                  <div className="absolute left-0 right-0 top-2 h-10">
                    {scheduleDrag?.projectId === project.id ? <div className="absolute -top-8 z-30 whitespace-nowrap rounded-sm bg-carbon px-2 py-1 text-[11px] font-label text-white shadow-sm" style={{ left: `${position.startPercent}%` }}>Inicio: {formatTimelineDate(position.startDate)} · Entrega: {formatTimelineDate(position.endDate)}</div> : null}
                    <div
                      className={cn("group absolute h-10 overflow-hidden rounded-component border px-3 py-2 text-sm font-label text-carbon shadow-sm", position.remainingClass, position.hasSchedule ? "cursor-grab active:cursor-grabbing" : "cursor-default")}
                      style={{ left: `${position.startPercent}%`, width: `${position.widthPercent}%` }}
                      onPointerDown={(event) => beginScheduleDrag(event, project, "move")}
                      onPointerMove={updateScheduleDrag}
                      onPointerUp={(event) => void finishScheduleDrag(event, project)}
                      title={position.hasSchedule ? `Inicio: ${toDateInputValue(position.startDate)} · Entrega: ${toDateInputValue(position.endDate)}` : "Definí las fechas del proyecto para editarlo desde acá"}
                    >
                      <div className="absolute inset-y-0 left-0 bg-slate-300/80" style={{ width: `${position.progressPct}%` }} />
                      <span className="sr-only">{project.nombre}</span>
                      {position.hasSchedule ? <button type="button" aria-label="Cambiar fecha de entrega" className="absolute inset-y-0 right-0 z-10 w-2 cursor-ew-resize bg-carbon/10 opacity-0 transition-opacity group-hover:opacity-100" onPointerDown={(event) => beginScheduleDrag(event, project, "resize")} onPointerMove={updateScheduleDrag} onPointerUp={(event) => void finishScheduleDrag(event, project)} /> : null}
                    </div>
                  </div>
                  <div className="pointer-events-none absolute left-0 right-0 top-[64px] h-10">{projectEvents.filter((event) => event.type === "pago").map((event) => <span key={event.id} title={event.label} className="absolute flex h-10 min-w-0 overflow-hidden items-center justify-center rounded-component border border-emerald-200 bg-emerald-50 px-1 text-[10px] font-label text-emerald-800 shadow-sm" style={{ left: `calc(${event.week * WEEK_PERCENT}% + 2px)`, width: `calc(${WEEK_PERCENT}% - 4px)` }}><span className="min-w-0 truncate">{event.amount != null ? formatMoney(event.amount) : "$ —"}</span></span>)}</div>
                  <div className="pointer-events-none absolute left-0 right-0 top-[120px] h-10">{projectEvents.filter((event) => event.type === "reunion").map((event) => <span key={event.id} title={event.date ? formatEventDate(event.date) : "Reunión"} className="absolute flex h-10 min-w-0 overflow-hidden items-center justify-center gap-1 rounded-component border border-violet-200 bg-violet-50 px-1 text-[10px] font-label text-violet-800 shadow-sm" style={{ left: `calc(${event.week * WEEK_PERCENT}% + 2px)`, width: `calc(${WEEK_PERCENT}% - 4px)` }}><VideoIcon size={12} className="shrink-0" /><span className="min-w-0 truncate">{event.date ? formatEventDate(event.date) : "Sin fecha"}</span></span>)}</div>
                  <div className="pointer-events-none absolute left-0 right-0 top-[176px] h-10">{projectEvents.filter((event) => event.type === "nota").map((event) => <span key={event.id} className="group pointer-events-auto absolute h-10 min-w-0" style={{ left: `calc(${event.week * WEEK_PERCENT}% + 2px)`, width: `calc(${WEEK_PERCENT}% - 4px)` }}><span className={cn("flex h-10 w-full items-center justify-center rounded-component border px-1 text-[10px] font-label shadow-sm", event.priority === "alta" ? "border-red-200 bg-red-100 text-red-800" : event.priority === "baja" ? "border-slate-200 bg-slate-100 text-slate-700" : "border-amber-200 bg-amber-100 text-amber-800")}>Nota</span><span className="absolute left-0 top-11 z-40 hidden w-64 rounded-card border border-line-soft bg-white p-3 text-left text-xs text-carbon shadow-modal group-hover:block"><span className="block font-label">{event.label}</span><span className="mt-1 block whitespace-pre-wrap text-graphite">{event.noteText || "Sin contenido"}</span></span></span>)}</div>
                </div>
              </div>;
            })}
          </div>
        </div>
      </div>

      {scheduleError ? <div className="border-t border-danger/20 bg-danger-light px-5 py-2 text-xs text-danger">{scheduleError}</div> : null}

      {activeCell ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-carbon/20 p-4" onMouseDown={() => setActiveCell(null)}><div className="w-full max-w-sm rounded-card border border-line-soft bg-white p-5 shadow-modal" onMouseDown={(event) => event.stopPropagation()}><h3 className="text-base font-title text-carbon">Agregar al timeline</h3><p className="mt-1 text-sm text-graphite">Semana {activeCell.week + 1} · {months[Math.floor(activeCell.week / WEEKS_PER_MONTH)]}</p><div className="mt-4 space-y-3"><div className="grid grid-cols-2 gap-2"><label className="block space-y-1 text-sm font-label text-carbon">Fecha<input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} className="mt-1 w-full rounded-component border border-line px-2 py-2 text-sm font-normal text-carbon outline-none focus:border-signal focus:ring-2 focus:ring-signal/20" /></label><label className="block space-y-1 text-sm font-label text-carbon">Horario<input type="time" value={eventTime} onChange={(event) => setEventTime(event.target.value)} className="mt-1 w-full rounded-component border border-line px-2 py-2 text-sm font-normal text-carbon outline-none focus:border-signal focus:ring-2 focus:ring-signal/20" /></label></div><label className="flex items-center gap-2 text-sm font-label text-carbon"><input type="checkbox" checked={Boolean(recurrenceFrequency)} onChange={(event) => setRecurrenceFrequency(event.target.checked ? "semanal" : null)} className="h-4 w-4 accent-signal" /> Repetir reunión</label>{recurrenceFrequency ? <div className="grid grid-cols-2 gap-2"><select value={recurrenceFrequency} onChange={(event) => setRecurrenceFrequency(event.target.value as FrecuenciaReunion)} className="rounded-component border border-line bg-white px-2 py-2 text-sm text-carbon"><option value="semanal">Cada semana</option><option value="quincenal">Cada 2 semanas</option><option value="mensual">Cada mes</option></select><input type="date" min={eventDate} value={recurrenceUntil} onChange={(event) => setRecurrenceUntil(event.target.value)} className="rounded-component border border-line px-2 py-2 text-sm text-carbon" /></div> : null}<input autoFocus value={eventLabel} onChange={(event) => setEventLabel(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void saveEvent()} placeholder="Título opcional (Reunión)" className="w-full rounded-component border border-line px-3 py-2 text-sm text-carbon outline-none focus:border-signal focus:ring-2 focus:ring-signal/20" />{eventError ? <p className="text-xs text-danger">{eventError}</p> : null}<div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setActiveCell(null)} className="rounded-component px-3 py-2 text-sm text-graphite hover:bg-paper">Cancelar</button><button type="button" onClick={() => void saveEvent()} disabled={eventSaving} className="rounded-component bg-signal px-3 py-2 text-sm font-label text-white disabled:cursor-not-allowed disabled:opacity-50">{eventSaving ? "Guardando..." : "Agregar"}</button></div></div></div></div> : null}
      {activeNote ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-carbon/20 p-4" onMouseDown={() => setActiveNote(null)}><div className="w-full max-w-sm rounded-card border border-line-soft bg-white p-5 shadow-modal" onMouseDown={(event) => event.stopPropagation()}><h3 className="text-base font-title text-carbon">Agregar nota</h3><p className="mt-1 text-sm text-graphite">Semana {activeNote.week + 1} · {months[Math.floor(activeNote.week / WEEKS_PER_MONTH)]}</p><div className="mt-4 space-y-3"><textarea autoFocus value={noteText} onChange={(event) => setNoteText(event.target.value)} placeholder="Escribí la nota..." rows={4} className="w-full resize-none rounded-component border border-line px-3 py-2 text-sm text-carbon outline-none focus:border-signal focus:ring-2 focus:ring-signal/20" /><label className="block space-y-1 text-sm font-label text-carbon">Prioridad<select value={notePriority} onChange={(event) => setNotePriority(event.target.value as "alta" | "media" | "baja")} className="mt-1 w-full rounded-component border border-line bg-white px-3 py-2 text-sm font-normal text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select></label>{noteError ? <p className="text-xs text-danger">{noteError}</p> : null}<div className="flex justify-end gap-2"><button type="button" onClick={() => setActiveNote(null)} className="rounded-component px-3 py-2 text-sm text-graphite hover:bg-paper">Cancelar</button><button type="button" onClick={() => void saveNote()} disabled={!noteText.trim() || noteSaving} className="rounded-component bg-signal px-3 py-2 text-sm font-label text-white disabled:cursor-not-allowed disabled:opacity-50">{noteSaving ? "Guardando..." : "Guardar nota"}</button></div></div></div></div> : null}
    </section>
  );
}
