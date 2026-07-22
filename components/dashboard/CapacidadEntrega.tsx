"use client";

import { Badge, Card } from "@/components/ui";
import { cn } from "@/lib/cn";

type CapacidadEntregaProps = {
  activos: number;
  capacidadMaxima: number;
};

function getEstado(ratio: number) {
  if (ratio > 100) {
    return {
      label: "Sobrecargado",
      variant: "danger" as const,
      bar: "bg-danger"
    };
  }

  if (ratio >= 85) {
    return {
      label: "Casi al límite",
      variant: "warning" as const,
      bar: "bg-warning"
    };
  }

  return {
    label: "Margen sano",
    variant: "success" as const,
    bar: "bg-signal"
  };
}

export function CapacidadEntrega({ activos, capacidadMaxima }: CapacidadEntregaProps) {
  const ratio = capacidadMaxima > 0 ? (activos / capacidadMaxima) * 100 : 0;
  const estado = getEstado(ratio);
  const visibleRatio = Math.min(ratio, 100);

  return (
    <Card padding="md" className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-title text-carbon">Capacidad del equipo</h3>
          <p className="text-sm text-graphite">Proyectos activos versus la capacidad máxima configurada.</p>
        </div>
        <Badge variant={estado.variant}>{estado.label}</Badge>
      </div>

      <div className="rounded-card border border-line-soft bg-paper p-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-label text-graphite">Ocupación</p>
            <p className="text-3xl font-title text-carbon">
              {activos}/{capacidadMaxima}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-label text-graphite">Carga actual</p>
            <p className="text-lg font-title text-carbon">{Math.round(ratio)}%</p>
          </div>
        </div>

        <div className="mt-4 h-3 rounded-pill bg-white">
          <div
            className={cn("h-3 rounded-pill transition-all duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)]", estado.bar)}
            style={{ width: `${visibleRatio}%` }}
          />
        </div>

        <p className="mt-3 text-xs text-graphite">
          {ratio > 100
            ? "La capacidad está excedida; conviene priorizar antes de sumar más frentes."
            : ratio >= 85
              ? "La capacidad está muy cerca del límite."
              : "Todavía hay margen para absorber nuevos proyectos."}
        </p>
      </div>
    </Card>
  );
}
