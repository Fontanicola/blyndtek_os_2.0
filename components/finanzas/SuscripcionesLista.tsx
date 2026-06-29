"use client";

import { Badge, Button, Card } from "@/components/ui";
import { formatFecha, formatUSD } from "@/lib/utils/formatters";
import type { Suscripcion } from "@/types/suscripciones";

type SuscripcionesListaProps = {
  suscripciones: Suscripcion[];
  onActivate: (suscripcion: Suscripcion) => Promise<void> | void;
  onNew: () => void;
  onEdit?: (suscripcion: Suscripcion) => void;
  onGenerateMonthly: () => Promise<void> | void;
  onMarkExpired: () => Promise<void> | void;
};

const estadoVariant = {
  pendiente: "warning",
  activa: "success",
  pausada: "signal",
  baja: "default"
} as const;

export function SuscripcionesLista({
  suscripciones,
  onActivate,
  onNew,
  onEdit,
  onGenerateMonthly,
  onMarkExpired
}: SuscripcionesListaProps) {
  return (
    <div className="space-y-4">
      <Card padding="md" className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-title text-carbon">Suscripciones</h3>
          <p className="text-sm text-graphite">Mantenimiento y planes recurrentes vinculados a clientes.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => void onGenerateMonthly()}>
            Generar cobros del mes
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void onMarkExpired()}>
            Marcar vencidos
          </Button>
          <Button variant="primary" size="sm" onClick={onNew}>
            Nueva suscripción
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {suscripciones.map((suscripcion) => (
          <Card key={suscripcion.id} padding="md" className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-label text-carbon">{suscripcion.cotizacion_id}</p>
                <p className="mt-1 text-sm text-graphite">
                  {suscripcion.tipo} · {formatUSD(suscripcion.monto_mensual)}
                </p>
              </div>
              <Badge variant={estadoVariant[suscripcion.estado]}>{suscripcion.estado}</Badge>
            </div>

            <div className="grid gap-3 text-sm text-graphite">
              <div className="flex items-center justify-between gap-3">
                <span>Inicio</span>
                <span>{suscripcion.fecha_inicio ? formatFecha(suscripcion.fecha_inicio) : "Pendiente"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Próximo cobro</span>
                <span>{suscripcion.proxima_cobro ? formatFecha(suscripcion.proxima_cobro) : "Sin fecha"}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {suscripcion.estado === "pendiente" ? (
                <Button variant="primary" size="sm" onClick={() => void onActivate(suscripcion)}>
                  Activar
                </Button>
              ) : null}
              {onEdit ? (
                <Button variant="ghost" size="sm" onClick={() => onEdit(suscripcion)}>
                  Editar
                </Button>
              ) : null}
            </div>
          </Card>
        ))}

        {suscripciones.length === 0 ? (
          <Card padding="md" className="md:col-span-2">
            <p className="text-sm text-graphite">Todavía no hay suscripciones activas o pendientes.</p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
