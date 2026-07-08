"use client";

import type { Feature, EstadoFeature } from "@/types/features";
import { cn } from "@/lib/cn";

export type FaseProyecto = {
  id: string;
  nombre: string;
};

type SubtareaChecklistItemProps = {
  subtarea: Feature;
  fasesDisponibles: FaseProyecto[];
  onEstadoChange: (estado: EstadoFeature) => void | Promise<void>;
  onMoverFase: (fase: string) => void | Promise<void>;
  onClick: () => void;
};

const ESTADOS: EstadoFeature[] = ["pendiente", "en_curso", "lista"];

function getNextEstado(estado: EstadoFeature): EstadoFeature {
  const index = ESTADOS.indexOf(estado);
  return ESTADOS[(index + 1) % ESTADOS.length] ?? "pendiente";
}

function getInitials(value: string | null | undefined) {
  if (!value) {
    return "--";
  }

  return value.slice(0, 2).toUpperCase();
}

function EstadoIndicator({ estado }: { estado: EstadoFeature }) {
  if (estado === "lista") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success text-[11px] font-title text-white">
        ✓
      </span>
    );
  }

  if (estado === "en_curso") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-signal bg-signal-light">
        <span className="h-2.5 w-2.5 rounded-full bg-signal" />
      </span>
    );
  }

  return <span className="h-5 w-5 rounded-full border border-[#D8DBE3] bg-white" />;
}

export function SubtareaChecklistItem({
  subtarea,
  fasesDisponibles,
  onEstadoChange,
  onMoverFase,
  onClick
}: SubtareaChecklistItemProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className="flex items-center gap-3 rounded-component bg-white p-2.5 transition-colors duration-fast ease-fast hover:bg-paper"
    >
      <button
        type="button"
        onClick={async (event) => {
          event.stopPropagation();
          await onEstadoChange(getNextEstado(subtarea.estado));
        }}
        className="shrink-0"
        aria-label="Cambiar estado"
      >
        <EstadoIndicator estado={subtarea.estado} />
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm text-carbon",
            subtarea.estado === "lista" && "text-graphite/60 line-through"
          )}
        >
          {subtarea.nombre}
        </p>
        <p className="truncate text-xs text-graphite">{subtarea.descripcion}</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-signal-light text-[10px] font-label text-signal">
          {getInitials(subtarea.responsable_id)}
        </div>

        <label className="sr-only" htmlFor={`fase-${subtarea.id}`}>
          Mover a fase
        </label>
        <select
          id={`fase-${subtarea.id}`}
          value={subtarea.fase}
          onClick={(event) => event.stopPropagation()}
          onChange={async (event) => {
            event.stopPropagation();
            await onMoverFase(event.target.value);
          }}
          className="max-w-[140px] rounded-component border border-line bg-white px-2 py-1 text-xs text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
        >
          {fasesDisponibles.map((fase) => (
            <option key={fase.id} value={fase.id}>
              {fase.nombre}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
