"use client";

import { useMemo, useState } from "react";
import { CalendarIcon, DollarSignIcon, PlusIcon, VideoIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { Proyecto } from "@/types/proyectos";

type TimelineProyectosProps = {
  proyectos: Proyecto[];
  clientes: Array<Pick<{ id: string; empresa: string }, "id" | "empresa">>;
  onSelectProject: (id: string) => void;
};

type EventType = "pago" | "reunion";
type TimelineEvent = { id: string; proyectoId: string; week: number; type: EventType; label: string };

const months = ["Agosto", "Septiembre", "Octubre", "Noviembre"];
const weeks = Array.from({ length: 16 }, (_, index) => index);
const monthColors = ["#D9E5FF", "#E8E2FF", "#DDF4EB", "#FFF0D5"];

const seedEvents: TimelineEvent[] = [
  { id: "funes-pago-1", proyectoId: "funes", week: 0, type: "pago", label: "Inicial" },
  { id: "funes-reunion-1", proyectoId: "funes", week: 1, type: "reunion", label: "Kickoff" },
  { id: "ha-pago-1", proyectoId: "ha", week: 0, type: "pago", label: "Inicial" },
  { id: "ha-reunion-1", proyectoId: "ha", week: 4, type: "reunion", label: "Seguimiento" },
  { id: "ha-pago-2", proyectoId: "ha", week: 8, type: "pago", label: "Cuota 2" },
  { id: "ha-reunion-2", proyectoId: "ha", week: 12, type: "reunion", label: "Revisión" },
  { id: "abc-pago-1", proyectoId: "abc", week: 0, type: "pago", label: "Inicial" },
  { id: "abc-pago-2", proyectoId: "abc", week: 4, type: "pago", label: "Cuota 2" },
  { id: "abc-pago-3", proyectoId: "abc", week: 8, type: "pago", label: "Cuota 3" },
  { id: "abc-pago-4", proyectoId: "abc", week: 12, type: "pago", label: "Cuota 4" },
  { id: "abc-reunion-1", proyectoId: "abc", week: 6, type: "reunion", label: "Demo" }
];

function projectPosition(index: number) {
  const starts = [0, 0, 1, 2, 5];
  const lengths = [3, 7, 9, 6, 5];
  return { start: starts[index % starts.length] ?? 0, length: lengths[index % lengths.length] ?? 4 };
}

function getClientName(id: string, clients: TimelineProyectosProps["clientes"]) {
  return clients.find((client) => client.id === id)?.empresa ?? "Cliente";
}

export function TimelineProyectos({ proyectos, clientes, onSelectProject }: TimelineProyectosProps) {
  const [events, setEvents] = useState<TimelineEvent[]>(seedEvents);
  const [activeCell, setActiveCell] = useState<{ proyectoId: string; week: number } | null>(null);
  const [eventType, setEventType] = useState<EventType>("reunion");
  const [eventLabel, setEventLabel] = useState("");

  const displayProjects = useMemo(() => proyectos.slice(0, 8), [proyectos]);
  const projectRows = displayProjects.length > 0 ? displayProjects : [
    { id: "funes", nombre: "Implementación web", cliente_id: "funes", estado: "en_desarrollo", fecha_inicio: null, entrega_comprometida: null, avance_pct: 38 } as Proyecto,
    { id: "ha", nombre: "Sistema interno", cliente_id: "ha", estado: "implementacion", fecha_inicio: null, entrega_comprometida: null, avance_pct: 61 } as Proyecto,
    { id: "abc", nombre: "Automatización", cliente_id: "abc", estado: "por_empezar", fecha_inicio: null, entrega_comprometida: null, avance_pct: 18 } as Proyecto
  ];

  function openCell(proyectoId: string, week: number) {
    setActiveCell({ proyectoId, week });
    setEventLabel("");
  }

  function saveEvent() {
    if (!activeCell || !eventLabel.trim()) return;
    setEvents((current) => [...current, { ...activeCell, id: `${Date.now()}`, type: eventType, label: eventLabel.trim() }]);
    setActiveCell(null);
  }

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-card border border-line-soft bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line-soft px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon size={18} className="text-signal" />
            <h2 className="text-lg font-title text-carbon">Timeline de proyectos</h2>
          </div>
          <p className="mt-1 text-sm text-graphite">Una vista operativa para anticipar entregas, cobros y reuniones.</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-graphite">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-signal" />Duración</span>
          <span className="flex items-center gap-1.5"><DollarSignIcon size={14} className="text-emerald-600" />Pago</span>
          <span className="flex items-center gap-1.5"><VideoIcon size={14} className="text-violet-600" />Reunión</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1080px] p-4">
          <div className="grid grid-cols-[180px_repeat(16,minmax(52px,1fr))]">
            <div className="border-b border-line-soft px-3 pb-3 text-[11px] font-label uppercase tracking-wider text-graphite">Proyecto</div>
            {months.map((month, index) => (
              <div key={month} className="border-b border-l border-line-soft px-2 pb-3 text-center text-xs font-title text-carbon" style={{ gridColumn: "span 4" }}>
                <span className="rounded-pill px-2 py-1" style={{ backgroundColor: monthColors[index] }}>{month}</span>
              </div>
            ))}

            <div className="border-b border-line-soft px-3 py-2 text-[11px] text-graphite">Semanas</div>
            {weeks.map((week) => <div key={week} className={cn("border-b border-l border-line-soft py-2 text-center text-[10px] text-graphite", week % 4 === 0 && "border-l-slate-300")}><span>{(week % 4) + 1}</span></div>)}

            {projectRows.map((project, index) => {
              const position = projectPosition(index);
              const clientName = getClientName(project.cliente_id, clientes) === "Cliente" ? ["Funes", "HA", "ABC"][index] ?? "Cliente" : getClientName(project.cliente_id, clientes);
              const alias = ["funes", "ha", "abc"][index];
              const projectEvents = events.filter((event) => event.proyectoId === project.id || event.proyectoId === alias);
              return (
                <div key={project.id} className="contents">
                  <button type="button" onClick={() => onSelectProject(project.id)} className="group flex min-h-[112px] flex-col justify-center border-b border-line-soft px-3 text-left hover:bg-paper">
                    <span className="text-sm font-title text-carbon group-hover:text-signal">{clientName}</span>
                    <span className="mt-1 truncate text-xs text-graphite">{project.nombre}</span>
                    <span className="mt-2 flex items-center gap-1.5 text-[10px] text-graphite"><span className="h-1.5 w-1.5 rounded-full bg-signal" />{project.avance_pct ?? 0}% avance</span>
                  </button>
                  <div className="relative col-span-16 grid grid-cols-16 border-b border-line-soft" style={{ gridColumn: "2 / span 16", gridRow: "auto" }}>
                    {weeks.map((week) => <button key={`${project.id}-${week}`} type="button" onClick={() => openCell(project.id, week)} aria-label={`Agregar evento en semana ${week + 1}`} className={cn("absolute top-0 h-full border-l border-line-soft/70 hover:bg-signal-light/30", week === 0 && "border-l-0")} style={{ left: `${(week / 16) * 100}%`, width: `${100 / 16}%` }} />)}
                    <div className="pointer-events-none absolute left-0 right-0 top-2 h-7">
                      <div className="h-7 rounded-component bg-signal px-3 py-1.5 text-xs font-label text-white shadow-sm" style={{ left: `${(position.start / 16) * 100}%`, width: `${(position.length / 16) * 100}%`, position: "absolute" }}>
                        <span className="truncate">{project.nombre}</span>
                      </div>
                    </div>
                    <div className="pointer-events-none absolute left-0 right-0 top-[46px] h-6">
                      {projectEvents.filter((event) => event.type === "pago").map((event) => <span key={event.id} title={event.label} className="absolute flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-2 ring-white" style={{ left: `${((event.week + 0.5) / 16) * 100}%` }}><DollarSignIcon size={13} /></span>)}
                    </div>
                    <div className="pointer-events-none absolute left-0 right-0 top-[77px] h-6">
                      {projectEvents.filter((event) => event.type === "reunion").map((event) => <span key={event.id} title={event.label} className="absolute flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full bg-violet-50 text-violet-700 ring-2 ring-white" style={{ left: `${((event.week + 0.5) / 16) * 100}%` }}><VideoIcon size={13} /></span>)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-graphite"><PlusIcon size={13} />Hacé click en cualquier semana para agendar un pago o reunión.</p>
        </div>
      </div>

      {activeCell ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-carbon/20 p-4" onMouseDown={() => setActiveCell(null)}>
          <div className="w-full max-w-sm rounded-card border border-line-soft bg-white p-5 shadow-modal" onMouseDown={(event) => event.stopPropagation()}>
            <h3 className="text-base font-title text-carbon">Agregar al timeline</h3>
            <p className="mt-1 text-sm text-graphite">Semana {activeCell.week + 1} · {months[Math.floor(activeCell.week / 4)]}</p>
            <div className="mt-4 space-y-3">
              <select value={eventType} onChange={(event) => setEventType(event.target.value as EventType)} className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"><option value="reunion">Reunión</option><option value="pago">Hito de pago</option></select>
              <input autoFocus value={eventLabel} onChange={(event) => setEventLabel(event.target.value)} onKeyDown={(event) => event.key === "Enter" && saveEvent()} placeholder="Ej. Demo con cliente" className="w-full rounded-component border border-line px-3 py-2 text-sm text-carbon outline-none focus:border-signal focus:ring-2 focus:ring-signal/20" />
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setActiveCell(null)} className="rounded-component px-3 py-2 text-sm text-graphite hover:bg-paper">Cancelar</button><button type="button" onClick={saveEvent} disabled={!eventLabel.trim()} className="rounded-component bg-signal px-3 py-2 text-sm font-label text-white disabled:cursor-not-allowed disabled:opacity-50">Agregar</button></div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
