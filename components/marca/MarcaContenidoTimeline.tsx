"use client";

import { useMemo, useRef } from "react";
import { Button } from "@/components/ui";
import { CalendarIcon, ClockIcon, PlusIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { CanalContenido, PiezaContenido } from "@/types/contenido";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const WEEK_WIDTH = 132;

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
  onOpen: (pieza: PiezaContenido) => void;
  onCreate: (canal: CanalContenido, date: Date) => void;
  onAddChannel: () => void;
};

export function MarcaContenidoTimeline({ canales, piezas, onOpen, onCreate, onAddChannel }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const weeks = useMemo(() => {
    const first = startOfWeek(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1));
    return Array.from({ length: 32 }, (_, index) => new Date(first.getTime() + index * WEEK_MS));
  }, []);
  const todayKey = toDateKey(new Date());
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

  const piecesByChannelAndDate = useMemo(() => {
    const map = new Map<string, PiezaContenido[]>();
    piezas.filter((pieza) => pieza.fecha_programada).forEach((pieza) => {
      const key = `${pieza.plataforma}:${pieceDateKey(pieza.fecha_programada)}`;
      map.set(key, [...(map.get(key) ?? []), pieza]);
    });
    return map;
  }, [piezas]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-graphite">Organizá qué se publica en cada canal y abrí cualquier pieza para editarla.</p>
        <Button size="sm" variant="secondary" onClick={onAddChannel}><PlusIcon size={16} /> Agregar canal</Button>
      </div>

      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <div ref={scrollerRef} className="overflow-x-auto overscroll-x-contain">
          <div className="min-w-max">
            <div className="sticky top-0 z-20 grid grid-cols-[244px_1fr] border-b border-slate-200 bg-white">
              <div className="flex items-end border-r border-slate-300 px-4 pb-3 text-xs font-label uppercase tracking-[0.14em] text-graphite">Canal</div>
              <div>
                <div className="flex h-12 border-b border-slate-200">
                  {monthGroups.map((month) => <div key={month.key} className="border-r border-slate-300 px-4 pt-3 text-center text-sm font-title capitalize text-carbon" style={{ width: month.count * WEEK_WIDTH }}>{month.label}</div>)}
                </div>
                <div className="flex h-9">
                  {weeks.map((week) => {
                    const key = toDateKey(week);
                    return <div key={key} className={cn("relative flex items-center justify-center border-r border-slate-200 text-xs font-label text-graphite", key === todayKey && "bg-amber-50 text-amber-800")} style={{ width: WEEK_WIDTH }}><span>Sem. {week.getDate()}</span>{key === todayKey ? <span className="absolute -top-1 h-2 w-2 rounded-full bg-amber-500" /> : null}</div>;
                  })}
                </div>
              </div>
            </div>

            {canales.map((canal) => (
              <div key={canal.id} className="grid grid-cols-[244px_1fr] border-b border-slate-300 last:border-b-0">
                <div className="sticky left-0 z-10 flex min-h-[132px] flex-col justify-center border-r border-slate-300 bg-white px-4">
                  <span className="text-sm font-title text-carbon">{canal.nombre}</span>
                  <span className="mt-1 text-xs text-graphite">{piezas.filter((pieza) => pieza.plataforma === canal.plataforma && pieza.fecha_programada).length} piezas programadas</span>
                </div>
                <div className="flex min-h-[132px]">
                  {weeks.map((week) => {
                    const dateKey = toDateKey(week);
                    const cellPieces = piecesByChannelAndDate.get(`${canal.plataforma}:${dateKey}`) ?? [];
                    return <div key={`${canal.id}-${dateKey}`} className={cn("group relative border-r border-slate-200 p-2", dateKey === todayKey && "bg-amber-50/60")} style={{ width: WEEK_WIDTH }}>
                      <button type="button" aria-label={`Agregar contenido en ${canal.nombre}, semana del ${dateKey}`} onClick={() => onCreate(canal, week)} className="absolute inset-0 z-0 opacity-0 transition-opacity group-hover:opacity-100"><span className="absolute right-2 top-2 rounded-md bg-white px-2 py-1 text-[11px] font-label text-signal shadow-sm">+ Agregar</span></button>
                      <div className="relative z-10 space-y-1">
                        {cellPieces.map((pieza) => <button key={pieza.id} type="button" onClick={() => onOpen(pieza)} className={cn("block w-full overflow-hidden rounded-md border px-2 py-2 text-left shadow-sm transition-shadow hover:shadow-md", channelColor(canal))} title={`${pieza.titulo} · ${pieceLabel(pieza)}`}><span className="flex items-center gap-1 text-[10px] font-label uppercase tracking-wide opacity-70"><ClockIcon size={11} /> {pieza.fecha_programada ? new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit" }).format(new Date(pieza.fecha_programada)) : ""}</span><span className="mt-1 block truncate text-xs font-label">{pieza.titulo}</span></button>)}
                      </div>
                    </div>;
                  })}
                </div>
              </div>
            ))}
            {canales.length === 0 ? <div className="p-10 text-center text-sm text-graphite"><CalendarIcon className="mx-auto mb-2 text-slate-400" size={24} />Todavía no hay canales configurados.</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
