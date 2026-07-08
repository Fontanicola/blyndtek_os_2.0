"use client";

import { Badge, Card } from "@/components/ui";
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

  if (normalized.length <= 30) {
    return normalized;
  }

  return `${normalized.slice(0, 27).trimEnd()}...`;
}

export function ProyectoCard({
  proyecto,
  clienteNombre,
  onClick,
  selected = false
}: ProyectoCardProps) {
  return (
    <Card
      padding="md"
      onClick={onClick}
      className={selected ? "h-full border-l-2 border-signal bg-signal-light" : "h-full"}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-label text-carbon">{proyecto.nombre}</p>
            <p className="mt-1 truncate text-sm text-graphite" title={clienteNombre}>
              {abbreviateClienteName(clienteNombre)}
            </p>
          </div>
          <Badge variant={getEstadoVariant(proyecto.estado)}>
            {PROYECTO_ESTADO_LABELS[proyecto.estado]}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="h-2 rounded-pill bg-paper">
            <div
              className="h-2 rounded-pill bg-signal transition-all duration-normal ease-normal"
              style={{ width: `${Math.min(Math.max(proyecto.avance_pct, 0), 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-3 text-xs text-graphite">
            <span>{proyecto.avance_pct}% completado</span>
            <span>
              Entrega comprometida: {formatShortDate(proyecto.entrega_comprometida)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
