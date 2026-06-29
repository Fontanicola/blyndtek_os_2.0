"use client";

import { Badge, Card } from "@/components/ui";
import {
  COTIZACION_ESTADO_LABELS,
  formatCurrency
} from "@/lib/cotizaciones";
import type { Cotizacion } from "@/types/cotizaciones";

type CotizacionCardProps = {
  cotizacion: Cotizacion;
  onClick: () => void;
};

function getEstadoVariant(estado: Cotizacion["estado"]) {
  if (estado === "enviada") {
    return "signal" as const;
  }

  if (estado === "aceptada") {
    return "success" as const;
  }

  if (estado === "rechazada") {
    return "danger" as const;
  }

  return "default" as const;
}

export function CotizacionCard({ cotizacion, onClick }: CotizacionCardProps) {
  const formattedDate = new Intl.DateTimeFormat("es-AR").format(
    new Date(cotizacion.updated_at)
  );

  return (
    <Card padding="lg" onClick={onClick}>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-label text-carbon">{cotizacion.empresa}</p>
            <p className="mt-1 text-xs text-graphite">{formattedDate}</p>
          </div>
          <Badge variant={getEstadoVariant(cotizacion.estado)}>
            {COTIZACION_ESTADO_LABELS[cotizacion.estado]}
          </Badge>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-label text-carbon">{formatCurrency(cotizacion.precio_total)}</p>
          {cotizacion.plazo_semanas ? (
            <p className="text-xs text-graphite">{cotizacion.plazo_semanas} semanas</p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
