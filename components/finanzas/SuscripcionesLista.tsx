"use client";

import { Badge, Button, Card } from "@/components/ui";
import { cn } from "@/lib/cn";
import { isCobroVencido } from "@/lib/finanzas";
import { fechaStringAFechaLocal, formatearFechaDisplay } from "@/lib/utils/fechas";
import { formatUSD } from "@/lib/utils/formatters";
import type { Cobro } from "@/types/cobros";
import type { Cliente } from "@/types/clientes";
import type { Cotizacion } from "@/types/cotizaciones";
import type { Suscripcion } from "@/types/suscripciones";

type SuscripcionesListaProps = {
  suscripciones: Suscripcion[];
  clientes: Array<Pick<Cliente, "id" | "empresa">>;
  cotizaciones: Array<Pick<Cotizacion, "id" | "empresa" | "precio_total">>;
  onActivate: (suscripcion: Suscripcion) => Promise<void> | void;
  onMarkCobrado: (suscripcion: Suscripcion, cobro: Cobro | null) => Promise<void> | void;
  onNew: () => void;
  onEdit?: (suscripcion: Suscripcion) => void;
  onGenerateMonthly: () => Promise<void> | void;
  onMarkExpired: () => Promise<void> | void;
  cobros: Cobro[];
};

const estadoVariant = {
  pendiente: "warning",
  activa: "success",
  pausada: "signal",
  baja: "default"
} as const;

export function SuscripcionesLista({
  suscripciones,
  clientes,
  onActivate,
  onMarkCobrado,
  onNew,
  onEdit,
  onGenerateMonthly,
  onMarkExpired,
  cobros,
  cotizaciones
}: SuscripcionesListaProps) {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  function getClienteLabel(clienteId: string | null, cotizacionId: string | null) {
    if (clienteId) {
      return clientes.find((cliente) => cliente.id === clienteId)?.empresa ?? "Cliente vinculado";
    }

    if (cotizacionId) {
      return cotizaciones.find((cotizacion) => cotizacion.id === cotizacionId)?.empresa ?? "Cotización vinculada";
    }

    return "Cliente vinculado";
  }

  function getCurrentCycleCobro(suscripcion: Suscripcion) {
    const related = cobros
      .filter((cobro) => cobro.suscripcion_id === suscripcion.id)
      .sort((first, second) => {
        const diffA = Math.abs(
          fechaStringAFechaLocal(first.fecha_vencimiento).getTime() -
            fechaStringAFechaLocal(suscripcion.proxima_cobro ?? first.fecha_vencimiento).getTime()
        );
        const diffB = Math.abs(
          fechaStringAFechaLocal(second.fecha_vencimiento).getTime() -
            fechaStringAFechaLocal(suscripcion.proxima_cobro ?? second.fecha_vencimiento).getTime()
        );
        return diffA - diffB;
      });

    return related[0] ?? null;
  }

  function shouldOfferMarkCobrado(suscripcion: Suscripcion) {
    const cycleCobro = getCurrentCycleCobro(suscripcion);
    if (cycleCobro) {
      return cycleCobro.estado !== "cobrado";
    }

    if (!suscripcion.proxima_cobro) {
      return false;
    }

    return fechaStringAFechaLocal(suscripcion.proxima_cobro) <= startOfToday;
  }

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
          <Card
            key={suscripcion.id}
            padding="md"
            className={cn(
              "space-y-4",
              suscripcion.estado === "activa" &&
                (() => {
                  const cycleCobro = getCurrentCycleCobro(suscripcion);
                  const proximaCobro = suscripcion.proxima_cobro;
                  const overdueWithoutCobro = !cycleCobro && proximaCobro ? fechaStringAFechaLocal(proximaCobro) < startOfToday : false;
                  const isOverdue = cycleCobro ? cycleCobro.estado === "pendiente" && isCobroVencido(cycleCobro) : overdueWithoutCobro;
                  return isOverdue ? "border border-danger/30 bg-danger-light" : "bg-white";
                })()
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-label text-carbon">
                  {getClienteLabel(suscripcion.cliente_id, suscripcion.cotizacion_id)}
                </p>
                <p className="mt-1 text-sm text-graphite">
                  {suscripcion.tipo} · {formatUSD(suscripcion.monto_mensual)}
                </p>
              </div>
              <Badge variant={estadoVariant[suscripcion.estado]}>{suscripcion.estado}</Badge>
            </div>

            <div className="grid gap-3 text-sm text-graphite">
              <div className="flex items-center justify-between gap-3">
                <span>Inicio</span>
                <span>{suscripcion.fecha_inicio ? formatearFechaDisplay(suscripcion.fecha_inicio) : "Pendiente"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Próximo cobro</span>
                <span>{suscripcion.proxima_cobro ? formatearFechaDisplay(suscripcion.proxima_cobro) : "Sin fecha"}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {suscripcion.estado === "pendiente" ? (
                <Button variant="primary" size="sm" onClick={() => void onActivate(suscripcion)}>
                  Activar
                </Button>
              ) : null}
              {suscripcion.estado === "activa" && shouldOfferMarkCobrado(suscripcion) ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void onMarkCobrado(suscripcion, getCurrentCycleCobro(suscripcion))}
                >
                  Marcar cobrado
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
