"use client";

import { Button } from "@/components/ui";
import { formatClock } from "@/lib/tiempo";
import type { FaseProyecto } from "@/types/fases-proyecto";
import type { ProyectoTiempoResponse } from "@/types/sesionesTiempo";
import type { CronometroSesionActiva } from "@/lib/hooks/useCronometro";

type CronometroFaseProps = {
  fase: Pick<FaseProyecto, "id" | "nombre">;
  tiempoProyecto: ProyectoTiempoResponse | null;
  sesionActiva: CronometroSesionActiva | null;
  tiempoTranscurrido: number;
  onIniciar: (faseId: string) => Promise<void> | void;
  onPausar: (sesionId: string, nota?: string) => Promise<void> | void;
};

function ClockIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 5.75V10l2.75 1.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M7.25 5.75 14.5 10l-7.25 4.25V5.75Z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M6.25 5.75h2.25v8.5H6.25v-8.5Zm5.25 0h2.25v8.5h-2.25v-8.5Z" fill="currentColor" />
    </svg>
  );
}

export function CronometroFase({
  fase,
  tiempoProyecto,
  sesionActiva,
  tiempoTranscurrido,
  onIniciar,
  onPausar
}: CronometroFaseProps) {
  const resumenFase = tiempoProyecto?.por_fase.find((item) => item.fase_id === fase.id) ?? null;
  const activeInThisPhase = sesionActiva?.fase_id === fase.id;
  const activeElsewhere = Boolean(sesionActiva && !activeInThisPhase);
  const liveSeconds = activeInThisPhase ? tiempoTranscurrido : 0;
  const totalSeconds = (resumenFase?.segundos ?? 0) + liveSeconds;

  return (
    <div className="flex items-center gap-2 rounded-card border border-line-soft bg-white/80 px-3 py-2 shadow-soft">
      {activeInThisPhase && sesionActiva ? (
        <Button
          variant="danger"
          size="sm"
          className="h-8 w-8 shrink-0 px-0"
          onClick={() => void onPausar(sesionActiva.id)}
          aria-label="Pausar cronómetro"
        >
          <PauseIcon />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 shrink-0 px-0"
          onClick={() => void onIniciar(fase.id)}
          disabled={activeElsewhere}
          aria-label={activeElsewhere ? "Ya hay un cronómetro activo" : "Iniciar cronómetro"}
        >
          <PlayIcon />
        </Button>
      )}

      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-graphite">
          <ClockIcon />
        </span>
        <span className="min-w-0 truncate text-[15px] font-title tabular-nums tracking-[0.04em] text-carbon">
          {formatClock(totalSeconds)}
        </span>
      </div>
    </div>
  );
}
