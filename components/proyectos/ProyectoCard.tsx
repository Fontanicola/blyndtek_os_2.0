"use client";

import { Badge } from "@/components/ui";
import { PROYECTO_ESTADO_LABELS } from "@/lib/proyectos";
import type { Proyecto } from "@/types/proyectos";

type ProyectoCardProps = {
  proyecto: Proyecto;
  clienteNombre: string;
  onClick: () => void;
  selected?: boolean;
};

function getEstadoVariant(estado: Proyecto["estado"]) {
  if (estado === "en_desarrollo" || estado === "implementacion") {
    return "signal" as const;
  }

  if (estado === "entregado") {
    return "success" as const;
  }

  if (estado === "pausado") {
    return "warning" as const;
  }

  return "default" as const;
}

function formatShortDate(value: string | null | undefined) {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit"
  }).format(date);
}

function abbreviateClienteName(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");

  if (normalized.length <= 26) {
    return normalized;
  }

  return `${normalized.slice(0, 23).trimEnd()}...`;
}

export function ProyectoCard({
  proyecto,
  clienteNombre,
  onClick,
  selected = false
}: ProyectoCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        selected
          ? "block w-full shrink-0 min-h-[76px] rounded-component bg-signal-light text-left"
          : "block w-full shrink-0 min-h-[76px] border-b border-[#EAECF0] bg-white px-3 py-3 text-left transition-colors duration-fast ease-fast last:border-b-0 hover:bg-paper"
      }
    >
      <div className={selected ? "space-y-1.5 px-3 py-3" : "space-y-1.5"}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-label text-carbon" title={clienteNombre}>
              {abbreviateClienteName(clienteNombre)}
            </p>
            <p className="truncate text-sm text-graphite" title={proyecto.nombre}>
              {proyecto.nombre}
            </p>
          </div>
          <Badge variant={getEstadoVariant(proyecto.estado)}>
            {PROYECTO_ESTADO_LABELS[proyecto.estado]}
          </Badge>
        </div>

        <div className="space-y-1">
          <div className="h-1.5 rounded-pill bg-paper">
            <div
              className="h-1.5 rounded-pill bg-signal transition-all duration-normal ease-normal"
              style={{ width: `${Math.min(Math.max(proyecto.avance_pct, 0), 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-3 text-xs text-graphite">
            <span>{proyecto.avance_pct}%</span>
            <span>{formatShortDate(proyecto.entrega_comprometida)}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
