"use client";

import { Card } from "@/components/ui";
import { cn } from "@/lib/cn";

type CapacidadEntregaProps = {
  activos: number;
  capacidadMaxima: number;
};

export function CapacidadEntrega({ activos, capacidadMaxima }: CapacidadEntregaProps) {
  const ratio = capacidadMaxima > 0 ? Math.min((activos / capacidadMaxima) * 100, 100) : 0;

  return (
    <Card padding="md" className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-title text-carbon">Capacidad de entrega</h3>
          <p className="text-sm text-graphite">Proyectos activos contra la capacidad máxima configurada.</p>
        </div>
        <p className="text-sm font-label text-carbon">
          {activos}/{capacidadMaxima}
        </p>
      </div>

      <div className="space-y-2">
        <div className="h-3 rounded-pill bg-paper">
          <div
            className={cn(
              "h-3 rounded-pill transition-all duration-normal ease-normal",
              ratio >= 100 ? "bg-danger" : ratio >= 80 ? "bg-warning" : "bg-signal"
            )}
            style={{ width: `${ratio}%` }}
          />
        </div>
        <p className="text-xs text-graphite">{Math.round(ratio)}% de ocupación</p>
      </div>
    </Card>
  );
}

