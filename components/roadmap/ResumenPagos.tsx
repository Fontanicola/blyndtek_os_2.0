import { Badge } from "@/components/ui";
import type { PublicRoadmapPaymentSummary } from "@/types/roadmap-public";

type ResumenPagosProps = {
  pagos: PublicRoadmapPaymentSummary;
};

function getBadgeVariant(estado: PublicRoadmapPaymentSummary["hitos"][number]["estado"]) {
  if (estado === "cobrado") {
    return "success" as const;
  }

  if (estado === "vencido") {
    return "danger" as const;
  }

  if (estado === "pendiente") {
    return "warning" as const;
  }

  return "default" as const;
}

function getBadgeLabel(estado: PublicRoadmapPaymentSummary["hitos"][number]["estado"]) {
  if (estado === "cobrado") {
    return "Pagado";
  }

  if (estado === "vencido") {
    return "Vencido";
  }

  if (estado === "facturado") {
    return "Facturado";
  }

  return "Pendiente";
}

export function ResumenPagos({ pagos }: ResumenPagosProps) {
  const progress = pagos.total_contrato > 0 ? Math.round((pagos.total_pagado / pagos.total_contrato) * 100) : 0;

  return (
    <div className="space-y-5 rounded-card bg-white p-6 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-label uppercase tracking-[0.16em] text-graphite">Resumen de pagos</p>
          <h2 className="mt-1 text-xl font-title text-carbon">Contrato y hitos</h2>
        </div>
        <Badge variant={progress >= 100 ? "success" : "signal"}>{progress}% cobrado</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-card bg-paper p-4">
          <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">Total contrato</p>
          <p className="mt-2 text-2xl font-title text-carbon">
            USD {pagos.total_contrato.toLocaleString()}
          </p>
        </div>
        <div className="rounded-card bg-paper p-4">
          <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">Pagado</p>
          <p className="mt-2 text-2xl font-title text-carbon">
            USD {pagos.total_pagado.toLocaleString()}
          </p>
        </div>
        <div className="rounded-card bg-paper p-4">
          <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">Pendiente</p>
          <p className="mt-2 text-2xl font-title text-carbon">
            USD {pagos.total_pendiente.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-label text-carbon">Avance de cobros</span>
          <span className="text-graphite">{progress}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-pill bg-paper">
          <div className="h-full rounded-pill bg-signal transition-all duration-normal ease-normal" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-title text-carbon">Hitos</h3>
        {pagos.hitos.length > 0 ? (
          <div className="space-y-2">
            {pagos.hitos.map((hito) => (
              <div key={`${hito.concepto}-${hito.fecha_vencimiento}`} className="flex items-center justify-between gap-3 rounded-card border border-line-soft bg-white p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-label text-carbon">{hito.concepto}</p>
                  <p className="text-xs text-graphite">
                    Vence: {new Date(hito.fecha_vencimiento).toLocaleDateString("es-AR")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-label text-carbon">USD {hito.monto.toLocaleString()}</span>
                  <Badge variant={getBadgeVariant(hito.estado)}>{getBadgeLabel(hito.estado)}</Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-graphite">No hay cobros públicos registrados todavía.</p>
        )}
      </div>
    </div>
  );
}
