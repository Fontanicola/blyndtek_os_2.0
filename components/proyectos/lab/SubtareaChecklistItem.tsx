"use client";

import type { Feature, EstadoFeature } from "@/types/features";
import type { Usuario } from "@/types/auth";
import { cn } from "@/lib/cn";
import { UserAvatar } from "@/components/ui";

export type { FaseProyecto } from "@/types/fases-proyecto";

type SubtareaChecklistItemProps = {
  subtarea: Feature;
  responsableUsuario?: Pick<Usuario, "nombre" | "foto_url"> | null;
  onEstadoChange: (estado: EstadoFeature) => void | Promise<void>;
  onClick: () => void;
};

const ESTADOS: EstadoFeature[] = ["pendiente", "en_curso", "lista"];

function getNextEstado(estado: EstadoFeature): EstadoFeature {
  const index = ESTADOS.indexOf(estado);
  return ESTADOS[(index + 1) % ESTADOS.length] ?? "pendiente";
}

function EstadoIndicator({ estado }: { estado: EstadoFeature }) {
  if (estado === "lista") {
    return (
      <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-success text-[10px] font-title text-white">
        ✓
      </span>
    );
  }

  if (estado === "en_curso") {
    return (
      <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-signal bg-signal-light">
        <span className="h-2 w-2 rounded-full bg-signal" />
      </span>
    );
  }

  return <span className="h-[18px] w-[18px] rounded-full border border-[#D8DBE3] bg-white" />;
}

export function SubtareaChecklistItem({
  subtarea,
  responsableUsuario,
  onEstadoChange,
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
      <UserAvatar
        name={responsableUsuario?.nombre ?? subtarea.responsable_id}
        fotoUrl={responsableUsuario?.foto_url ?? null}
        size="xs"
        className="shrink-0"
        textClassName="text-[9px]"
      />
    </div>
  );
}
