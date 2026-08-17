"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { CalendarIcon, ClockIcon, PlusIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { CanalContenido, FeedSlotContenido, PiezaContenido } from "@/types/contenido";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const WEEK_WIDTH = 132;
const DAY_WIDTH = 112;

function startOfWeek(date: Date) {
  const value = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = value.getDay();
  value.setDate(value.getDate() - (day === 0 ? 6 : day - 1));
  value.setHours(0, 0, 0, 0);
  return value;
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function pieceDateKey(value: string | null) {
  return value ? value.slice(0, 10) : null;
}

function channelColor(channel: CanalContenido) {
  if (channel.color === "violet") return "border-violet-200 bg-violet-50 text-violet-700";
  if (channel.color === "pink") return "border-pink-200 bg-pink-50 text-pink-700";
  if (channel.color === "blue") return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-signal/30 bg-signal-light/50 text-signal";
}

function pieceLabel(pieza: PiezaContenido) {
  if (pieza.estado === "publicada") return "Publicada";
  if (pieza.estado === "programada") return "Programada";
  return "Borrador";
}

type Props = {
  canales: CanalContenido[];
  piezas: PiezaContenido[];
  feedSlots: FeedSlotContenido[];
  onOpen: (pieza: PiezaContenido) => void;
  onCreate: (canal: CanalContenido, date: Date) => void;
  onAddChannel: () => void;
};

export function MarcaContenidoTimeline({ canales, piezas, feedSlots, onOpen, onCreate, onAddChannel }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const currentWeekRef = useRef<HTMLDivElement>(null);
  const [expandedWeekKey, setExpandedWeekKey] = useState<string | null>(null);
  const weeks = useMemo(() => {
    const first = startOfWeek(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1));
    return Array.from({ length: 32 }, (_, index) => new Date(first.getTime() + index * WEEK_MS));
  }, []);
  const todayKey = toDateKey(new Date());
  const currentWeekIndex = useMemo(() => weeks.findIndex((week) => toDateKey(week) === todayKey), [todayKey, weeks]);

  useEffect(() => {
    if (!scrollerRef.current || !currentWeekRef.current || currentWeekIndex < 0) return;
    const frame = window.requestAnimationFrame(() => {
      currentWeekRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [currentWeekIndex]);

  const monthGroups = useMemo(() => {
    const groups: Array<{ key: string; label: string; start: number; count: number }> = [];
    weeks.forEach((week, index) => {
      const key = `${week.getFullYear()}-${week.getMonth()}`;
      const current = groups.at(-1);
      if (current?.key === key) current.count += 1;
      else groups.push({ key, label: new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(week), start: index, count: 1 });
    });
    return groups;
  }, [weeks]);

  const weekNumberByKey = useMemo(() => {
    const counters = new Map<string, number>();
    return new Map(weeks.map((week) => {
      const monthKey = `${week.getFullYear()}-${week.getMonth()}`;
      const number = (counters.get(monthKey) ?? 0) + 1;
      counters.set(monthKey, number);
      return [toDateKey(week), number] as const;
    }));
  }, [weeks]);

  const piecesByChannelAndDate = useMemo(() => {
    const map = new Map<string, PiezaContenido[]>();
    const feedDatesByPieceId = new Map<string, string | null>();
    for (const plataforma of ["instagram_feed", "linkedin_post"] as const) {
      const feedPieces = piezas
        .filter((pieza) => pieza.plataforma === plataforma)
        .sort((a, b) => Number(b.feed_pineado) - Number(a.feed_pineado) || (a.feed_orden ?? Number.MAX_SAFE_INTEGER) - (b.feed_orden ?? Number.MAX_SAFE_INTEGER) || a.created_at.localeCompare(b.created_at));
      feedPieces.forEach((pieza, index) => {
        feedDatesByPieceId.set(pieza.id, feedSlots.find((slot) => slot.plataforma === plataforma && slot.slot_orden === index)?.fecha_programada ?? null);
      });
    }

    piezas.forEach((pieza) => {
      const feedDate = feedDatesByPieceId.get(pieza.id) ?? null;
      const effectiveDate = feedDate || pieza.fecha_programada;
      if (!effectiveDate) return;
      const key = `${pieza.plataforma}:${pieceDateKey(effectiveDate)}`;
      map.set(key, [...(map.get(key) ?? []), pieza]);
    });
    return map;
  }, [feedSlots, piezas]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-graphite">Organizá qué se publica en cada canal y abrí cualquier pieza para editarla.</p>
        <Button size="sm" variant="secondary" onClick={onAddChannel}><PlusIcon size={16} /> Agregar canal</Button>
      </div>

      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="flex min-w-0">
          <div className="sticky left-0 z-30 w-[244px] shrink-0 bg-white">
            <div className={cn("box-border sticky top-0 z-20 flex items-end border-b border-r border-slate-300 px-4 pb-3 text-xs font-label uppercase tracking-[0.14em] text-graphite", expandedWeekKey ? "h-[120px]" : "h-[84px]")}>Canal</div>
            {canales.map((canal) => <div key={canal.id} className="box-border flex h-[132px] min-h-0 flex-col justify-center overflow-hidden border-b border-r border-slate-300 px-4 last:border-b-0"><span className="text-sm font-title text-carbon">{canal.nombre}</span><span className="mt-1 text-xs text-graphite">{piezas.filter((pieza) => pieza.plataforma === canal.plataforma && pieza.fecha_programada).length} piezas programadas</span></div>)}
            {canales.length === 0 ? <div className="box-border flex h-[132px] min-h-0 items-center justify-center overflow-hidden border-r border-slate-300 p-6 text-center text-sm text-graphite"><CalendarIcon className="mr-2 shrink-0 text-slate-400" size={20} />Sin canales</div> : null}
          </div>
          <div ref={scrollerRef} className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain">
            <div className="min-w-max">
              <div className="sticky top-0 z-20 border-b border-slate-200 bg-white">
                <div className="flex h-12 border-b border-slate-200">
                  {monthGroups.map((month) => <div key={month.key} className="border-r border-slate-300 px-4 pt-3 text-center text-sm font-title capitalize text-carbon" style={{ width: weeks.slice(month.start, month.start + month.count).reduce((total, week) => total + (toDateKey(week) === expandedWeekKey ? DAY_WIDTH * 7 : WEEK_WIDTH), 0) }}>{month.label}</div>)}
                </div>
                <div className="flex min-h-9">
                  {weeks.map((week) => {
                    const key = toDateKey(week);
                    const expanded = key === expandedWeekKey;
                    return <div ref={key === todayKey ? currentWeekRef : undefined} key={key} className={cn("relative shrink-0 border-r border-slate-200 text-xs font-label text-graphite", key === todayKey && "bg-amber-50 text-amber-800")} style={{ width: expanded ? DAY_WIDTH * 7 : WEEK_WIDTH }}>
                      <button type="button" onClick={() => setExpandedWeekKey(expanded ? null : key)} className="flex h-9 w-full items-center justify-center font-label hover:bg-slate-50" aria-label={`${expanded ? "Contraer" : "Expandir"} semana ${weekNumberByKey.get(key) ?? 1}`}><span>Sem. {weekNumberByKey.get(key) ?? 1}</span>{key === todayKey ? <span className="absolute -top-1 h-2 w-2 rounded-full bg-amber-500" /> : null}</button>
                      {expanded ? <div className="grid grid-cols-7 border-t border-slate-200">{Array.from({ length: 7 }, (_, dayIndex) => { const day = addDays(week, dayIndex); return <div key={toDateKey(day)} className="flex h-9 items-center justify-center border-r border-slate-200 text-[10px]">{new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric" }).format(day)}</div>; })}</div> : null}
                    </div>;
                  })}
                </div>
              </div>
              {canales.map((canal) => <div key={canal.id} className="box-border flex h-[132px] min-h-0 overflow-hidden border-b border-slate-300 last:border-b-0">
                {weeks.map((week) => {
                  const expanded = toDateKey(week) === expandedWeekKey;
                  const days = expanded ? Array.from({ length: 7 }, (_, dayIndex) => addDays(week, dayIndex)) : [week];
                  return <div key={`${canal.id}-${toDateKey(week)}`} className="grid h-[132px] shrink-0" style={{ width: expanded ? DAY_WIDTH * 7 : WEEK_WIDTH, gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
                    {days.map((day) => { const dateKey = toDateKey(day); const cellPieces = piecesByChannelAndDate.get(`${canal.plataforma}:${dateKey}`) ?? []; return <div key={`${canal.id}-${dateKey}`} className={cn("group relative h-[132px] border-r border-slate-200 p-2", dateKey === todayKey && "bg-amber-50/60")}>
                      <button type="button" aria-label={`Agregar contenido en ${canal.nombre}, día ${dateKey}`} onClick={() => onCreate(canal, day)} className="absolute inset-0 z-0 opacity-0 transition-opacity group-hover:opacity-100"><span className="absolute right-2 top-2 rounded-md bg-white px-2 py-1 text-[11px] font-label text-signal shadow-sm">+ Agregar</span></button>
                      <div className="relative z-10 space-y-1">{cellPieces.map((pieza) => <button key={pieza.id} type="button" onClick={() => onOpen(pieza)} className={cn("block w-full overflow-hidden rounded-md border px-2 py-2 text-left shadow-sm transition-shadow hover:shadow-md", channelColor(canal))} title={`${pieza.titulo} · ${pieceLabel(pieza)}`}><span className="flex items-center gap-1 text-[10px] font-label uppercase tracking-wide opacity-70"><ClockIcon size={11} /> {pieza.fecha_programada ? new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit" }).format(new Date(pieza.fecha_programada)) : ""}</span><span className="mt-1 block truncate text-xs font-label">{pieza.titulo}</span></button>)}</div>
                    </div>; })}
                  </div>;
                })}
              </div>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
