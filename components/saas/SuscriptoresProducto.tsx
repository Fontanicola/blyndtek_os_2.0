"use client";

import { Badge, Card } from "@/components/ui";
import { formatFecha, formatUSD } from "@/lib/utils/formatters";
import type { Cliente } from "@/types/clientes";
import type { Suscripcion } from "@/types/suscripciones";

type SuscriptoresProductoProps = {
  suscripciones: Suscripcion[];
  clientes: Array<Pick<Cliente, "id" | "empresa" | "pais" | "estado">>;
};

const estadoVariant = {
  pendiente: "warning",
  activa: "success",
  pausada: "signal",
  baja: "default"
} as const;

function getClienteNombre(suscripcion: Suscripcion, clientes: SuscriptoresProductoProps["clientes"]) {
  return clientes.find((cliente) => cliente.id === suscripcion.cliente_id)?.empresa ?? "Cliente sin nombre";
}

export function SuscriptoresProducto({ suscripciones, clientes }: SuscriptoresProductoProps) {
  const ordenadas = [...suscripciones].sort((first, second) => {
    const firstDate = first.proxima_cobro ?? first.fecha_inicio ?? "";
    const secondDate = second.proxima_cobro ?? second.fecha_inicio ?? "";
    return firstDate.localeCompare(secondDate) || second.created_at.localeCompare(first.created_at);
  });

  return (
    <Card padding="md" className="space-y-4">
      <div>
        <h3 className="text-base font-title text-carbon">Suscriptores</h3>
        <p className="text-sm text-graphite">Clientes con suscripción asociada al producto seleccionado.</p>
      </div>

      {ordenadas.length === 0 ? (
        <div className="rounded-card border border-line-soft bg-paper px-4 py-8 text-sm text-graphite">
          Todavía no hay suscriptores para este producto.
        </div>
      ) : (
        <div className="space-y-3">
          {ordenadas.map((suscripcion) => (
            <div key={suscripcion.id} className="rounded-card border border-line-soft bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-label text-carbon">{getClienteNombre(suscripcion, clientes)}</p>
                  <p className="mt-1 text-sm text-graphite">
                    {suscripcion.tipo} · {formatUSD(suscripcion.monto_mensual)}
                  </p>
                </div>
                <Badge variant={estadoVariant[suscripcion.estado]}>{suscripcion.estado}</Badge>
              </div>

              <div className="mt-4 grid gap-2 text-sm text-graphite">
                <div className="flex items-center justify-between gap-3">
                  <span>Inicio</span>
                  <span>{suscripcion.fecha_inicio ? formatFecha(suscripcion.fecha_inicio) : "Pendiente"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Próximo cobro</span>
                  <span>{suscripcion.proxima_cobro ? formatFecha(suscripcion.proxima_cobro) : "Sin fecha"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
