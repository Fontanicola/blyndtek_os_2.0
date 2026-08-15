"use client";

import { useEffect, useMemo, useState } from "react";
import { DollarSignIcon, VideoIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { Evento } from "@/types/eventos";
import type { Proyecto } from "@/types/proyectos";

type TimelineProyectosProps = {
  proyectos: Proyecto[];
  clientes: Array<Pick<{ id: string; empresa: string }, "id" | "empresa">>;
  currentUserId?: string | null;
  onSelectProject: (id: string) => void;
};

type EventType = "pago" | "reunion";
type TimelineEvent = {
  id: string;
  proyectoId: string;
  clientId?: string | null;
  week: number;
  type: EventType;
  label: string;
  amount?: number;
  date?: string;
};

const WEEKS_PER_MONTH = 4;
const TOTAL_MONTHS = 12;
const TOTAL_WEEKS = WEEKS_PER_MONTH * TOTAL_MONTHS;
const WEEK_PERCENT = 100 / TOTAL_WEEKS;
const weeks = Array.from({ length: TOTAL_WEEKS }, (_, index) => index);
const seedEvents: TimelineEvent[] = [
  { id: "funes-pago-1", proyectoId: "funes", week: 0, type: "pago", label: "Inicial", amount: 1500 },
  { id: "funes-reunion-1", proyectoId: "funes", week: 1, type: "reunion", label: "Kickoff" },
  { id: "ha-pago-1", proyectoId: "ha", week: 0, type: "pago", label: "Inicial", amount: 2200 },
  { id: "ha-reunion-1", proyectoId: "ha", week: 4, type: "reunion", label: "Seguimiento" },
  { id: "ha-pago-2", proyectoId: "ha", week: 8, type: "pago", label: "Cuota 2", amount: 1800 },
  { id: "ha-reunion-2", proyectoId: "ha", week: 12, type: "reunion", label: "Revisión" },
  { id: "abc-pago-1", proyectoId: "abc", week: 0, type: "pago", label: "Inicial", amount: 1000 },
  { id: "abc-pago-2", proyectoId: "abc", week: 4, type: "pago", label: "Cuota 2", amount: 1000 },
  { id: "abc-pago-3", proyectoId: "abc", week: 8, type: "pago", label: "Cuota 3", amount: 1000 },
  { id: "abc-pago-4", proyectoId: "abc", week: 12, type: "pago", label: "Cuota 4", amount: 1000 },
  { id: "abc-reunion-1", proyectoId: "abc", week: 6, type: "reunion", label: "Demo" }
];

function projectPosition(index: number) {
  const starts = [0, 0, 4, 8, 12];
  const lengths = [4, 8, 12, 8, 6];
  return { start: starts[index % starts.length] ?? 0, length: lengths[index % lengths.length] ?? 4 };
}

function getClientName(id: string, clients: TimelineProyectosProps["clientes"]) {
  return clients.find((client) => client.id === id)?.empresa ?? "Cliente";
}

function formatMoney(value: number) {
  return `$ ${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(value)}`;
}

function formatEventDate(value: Date | string) {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" }).format(new Date(value)).replace(".", "");
}

function getWeekIndex(value: string | Date, timelineStart: Date) {
  const date = new Date(value);
  return Math.max(0, Math.min(TOTAL_WEEKS - 1, Math.floor((date.getTime() - timelineStart.getTime()) / (7 * 24 * 60 * 60 * 1000))));
}

function getWeekDate(week: number, timelineStart: Date) {
  const date = new Date(timelineStart);
  date.setDate(date.getDate() + week * 7 + 1);
  date.setHours(10, 0, 0, 0);
  return date;
}

export function TimelineProyectos({ proyectos, clientes, currentUserId, onSelectProject }: TimelineProyectosProps) {
  const timelineStart = useMemo(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }, []);
  const months = useMemo(() => Array.from({ length: TOTAL_MONTHS }, (_, index) => {
    const date = new Date(timelineStart.getFullYear(), timelineStart.getMonth() + index, 1);
    return new Intl.DateTimeFormat("es-AR", { month: "long" }).format(date);
  }), [timelineStart]);
  const currentWeek = getWeekIndex(new Date(), timelineStart);
  const [events, setEvents] = useState<TimelineEvent[]>(seedEvents);
  const [activeCell, setActiveCell] = useState<{ proyectoId: string; clientId: string; week: number } | null>(null);
  const [eventType, setEventType] = useState<EventType>("reunion");
  const [eventLabel, setEventLabel] = useState("");
  const [eventAmount, setEventAmount] = useState("");
  const [eventSaving, setEventSaving] = useState(false);
  const [eventError, setEventError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMeetings() {
      try {
        const response = await fetch("/api/eventos?tipo=reunion", { cache: "no-store" });
        const payload = (await response.json()) as { data?: Evento[] };
        if (!response.ok || cancelled) return;

        const meetings = (payload.data ?? []).map((meeting) => ({
          id: meeting.id,
          proyectoId: "",
          clientId: meeting.relacion_id,
          week: getWeekIndex(meeting.fecha_inicio, timelineStart),
          type: "reunion" as const,
          label: meeting.titulo.replace(/^Cancelada · /, ""),
          date: meeting.fecha_inicio
        }));
        setEvents((current) => [...current.filter((event) => event.type !== "reunion" || event.proyectoId), ...meetings]);
      } catch {
        // El timeline mantiene sus hitos locales si el calendario no está disponible.
      }
    }

    void loadMeetings();
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
    setEventAmount("");
    setEventError(null);
  }

  async function saveEvent() {
    if (!activeCell || !eventLabel.trim() || eventSaving) return;
    const date = getWeekDate(activeCell.week, timelineStart);

    if (eventType === "pago") {
      setEvents((current) => [...current, { id: `${Date.now()}`, ...activeCell, type: "pago", label: eventLabel.trim(), amount: Number(eventAmount) || 0, date: date.toISOString() }]);
      setActiveCell(null);
      return;
    }

    setEventSaving(true);
    setEventError(null);
    try {
      const end = new Date(date);
      end.setHours(end.getHours() + 1);
      const response = await fetch("/api/eventos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: eventLabel.trim(),
          fecha_inicio: date.toISOString(),
          fecha_fin: end.toISOString(),
          tipo: "reunion",
          usuario_id: currentUserId ?? undefined,
          relacion_tipo: activeCell.clientId ? "cliente" : null,
          relacion_id: activeCell.clientId || null,
          referencia_tipo: "lead",
          referencia_id: currentUserId ?? undefined,
          crear_meet: false
        })
      });
      const payload = (await response.json()) as { data?: Evento; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error ?? "No se pudo crear la reunión.");
      setEvents((current) => [...current, { id: payload.data!.id, ...activeCell, type: "reunion", label: eventLabel.trim(), date: payload.data!.fecha_inicio }]);
      setActiveCell(null);
    } catch (error) {
      setEventError(error instanceof Error ? error.message : "No se pudo crear la reunión.");
    } finally {
      setEventSaving(false);
    }
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-card border border-line-soft bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-end gap-3 border-b border-line-soft px-5 py-3 text-xs text-graphite">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-signal" />Duración</span>
        <span className="flex items-center gap-1.5"><DollarSignIcon size={14} className="text-emerald-600" />Pago</span>
        <span className="flex items-center gap-1.5"><VideoIcon size={14} className="text-violet-600" />Reunión</span>
        <span className="ml-2 flex items-center gap-1.5 font-label text-signal"><span className="h-2.5 w-2.5 rounded-full bg-signal" />Semana actual</span>
      </div>

      <div className="overflow-x-auto overscroll-x-contain pb-3">
        <div className="min-w-[3716px]">
          <div className="grid grid-cols-[260px_repeat(48,minmax(72px,1fr))]">
            <div className="sticky left-0 z-20 border-b-2 border-line bg-white px-3 pb-3 text-[11px] font-label uppercase tracking-wider text-graphite">Proyecto</div>
            {months.map((month) => <div key={month} className="border-b-2 border-l border-line px-2 pb-3 text-center text-xs font-title capitalize text-carbon" style={{ gridColumn: `span ${WEEKS_PER_MONTH}` }}>{month}</div>)}
            <div className="sticky left-0 z-20 border-b-2 border-line bg-white px-3 py-2 text-[11px] text-graphite">Semanas</div>
            {weeks.map((week) => <div key={week} className={cn("relative border-b-2 border-l border-line py-2 text-center text-[10px] text-graphite", week % WEEKS_PER_MONTH === 0 && "border-l-slate-300", week === currentWeek && "bg-signal-light/50 font-title text-signal")}><span>{(week % WEEKS_PER_MONTH) + 1}</span>{week === currentWeek ? <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-signal" title="Semana actual" /> : null}</div>)}

            {projectRows.map((project, index) => {
              const position = projectPosition(index);
              const resolvedClientName = getClientName(project.cliente_id, clientes);
              const clientName = resolvedClientName === "Cliente" ? ["Funes", "HA", "ABC"][index] ?? "Cliente" : resolvedClientName;
              const alias = ["funes", "ha", "abc"][index];
              const projectEvents = events.filter((event) => event.proyectoId === project.id || event.proyectoId === alias || event.clientId === project.cliente_id);
              return <div key={project.id} className="contents">
                <div className="sticky left-0 z-10 grid h-[168px] grid-cols-[minmax(0,1fr)_48px] grid-rows-[56px_56px_56px] border-b-2 border-line bg-white">
                  <button type="button" onClick={() => onSelectProject(project.id)} className="group row-span-3 flex min-w-0 flex-col justify-center px-3 text-left hover:bg-paper"><span className="text-sm font-title text-carbon group-hover:text-signal">{clientName}</span><span className="mt-1 truncate text-xs text-graphite">{project.nombre}</span><span className="mt-2 flex items-center gap-1.5 text-[10px] text-graphite"><span className="h-1.5 w-1.5 rounded-full bg-signal" />{project.avance_pct ?? 0}% avance</span></button>
                  <div className="row-span-3 grid grid-rows-[56px_56px_56px] border-l border-line text-graphite"><span className="flex items-center justify-center border-b border-line-soft text-sm" title="Duración">■</span><span className="flex items-center justify-center border-b border-line-soft text-base" title="Hitos de pago">$</span><span className="flex items-center justify-center text-base" title="Reuniones"><VideoIcon size={18} /></span></div>
                </div>
                <div className="relative h-[168px] border-l-2 border-b-2 border-line" style={{ gridColumn: `2 / span ${TOTAL_WEEKS}` }}>
                  {weeks.map((week) => <button key={`${project.id}-${week}`} type="button" onClick={() => openCell(project, week)} aria-label={`Agregar evento en semana ${week + 1}`} className={cn("absolute top-0 h-full border-l border-line-soft/70 hover:bg-signal-light/30", week === 0 && "border-l-0", week === currentWeek && "bg-signal-light/20")} style={{ left: `${week * WEEK_PERCENT}%`, width: `${WEEK_PERCENT}%` }} />)}
                  <div className="pointer-events-none absolute left-0 right-0 top-2 h-10"><div className="absolute h-10 rounded-component bg-signal px-3 py-2 text-sm font-label text-white shadow-sm" style={{ left: `${position.start * WEEK_PERCENT}%`, width: `${position.length * WEEK_PERCENT}%` }}><span className="truncate">{project.nombre}</span></div></div>
                  <div className="pointer-events-none absolute left-0 right-0 top-[64px] h-10">{projectEvents.filter((event) => event.type === "pago").map((event) => <span key={event.id} title={event.label} className="absolute flex h-10 min-w-0 overflow-hidden items-center justify-center rounded-component border border-emerald-200 bg-emerald-50 px-1 text-[10px] font-label text-emerald-800 shadow-sm" style={{ left: `calc(${event.week * WEEK_PERCENT}% + 2px)`, width: `calc(${WEEK_PERCENT}% - 4px)` }}><span className="min-w-0 truncate">{event.amount != null ? formatMoney(event.amount) : "$ —"}</span></span>)}</div>
                  <div className="pointer-events-none absolute left-0 right-0 top-[120px] h-10">{projectEvents.filter((event) => event.type === "reunion").map((event) => <span key={event.id} title={event.label} className="absolute flex h-10 min-w-0 overflow-hidden items-center justify-center gap-1 rounded-component border border-violet-200 bg-violet-50 px-1 text-[10px] font-label text-violet-800 shadow-sm" style={{ left: `calc(${event.week * WEEK_PERCENT}% + 2px)`, width: `calc(${WEEK_PERCENT}% - 4px)` }}><VideoIcon size={12} className="shrink-0" /><span className="min-w-0 truncate">{event.date ? formatEventDate(event.date) : event.label}</span></span>)}</div>
                </div>
              </div>;
            })}
          </div>
        </div>
      </div>

      {activeCell ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-carbon/20 p-4" onMouseDown={() => setActiveCell(null)}><div className="w-full max-w-sm rounded-card border border-line-soft bg-white p-5 shadow-modal" onMouseDown={(event) => event.stopPropagation()}><h3 className="text-base font-title text-carbon">Agregar al timeline</h3><p className="mt-1 text-sm text-graphite">Semana {activeCell.week + 1} · {months[Math.floor(activeCell.week / WEEKS_PER_MONTH)]} · {formatEventDate(getWeekDate(activeCell.week, timelineStart))}</p><div className="mt-4 space-y-3"><select value={eventType} onChange={(event) => setEventType(event.target.value as EventType)} className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"><option value="reunion">Reunión</option><option value="pago">Hito de pago</option></select><input autoFocus value={eventLabel} onChange={(event) => setEventLabel(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void saveEvent()} placeholder={eventType === "pago" ? "Ej. Cuota 2" : "Ej. Demo con cliente"} className="w-full rounded-component border border-line px-3 py-2 text-sm text-carbon outline-none focus:border-signal focus:ring-2 focus:ring-signal/20" />{eventType === "pago" ? <input value={eventAmount} onChange={(event) => setEventAmount(event.target.value)} type="number" min="0" placeholder="Monto a pagar (USD)" className="w-full rounded-component border border-line px-3 py-2 text-sm text-carbon outline-none focus:border-signal focus:ring-2 focus:ring-signal/20" /> : null}{eventError ? <p className="text-xs text-danger">{eventError}</p> : null}<div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setActiveCell(null)} className="rounded-component px-3 py-2 text-sm text-graphite hover:bg-paper">Cancelar</button><button type="button" onClick={() => void saveEvent()} disabled={!eventLabel.trim() || eventSaving} className="rounded-component bg-signal px-3 py-2 text-sm font-label text-white disabled:cursor-not-allowed disabled:opacity-50">{eventSaving ? "Guardando..." : "Agregar"}</button></div></div></div></div> : null}
    </section>
  );
}
