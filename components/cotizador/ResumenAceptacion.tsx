"use client";

import { Badge, Card } from "@/components/ui";
import type { Cotizacion } from "@/types/cotizaciones";

type ResumenAceptacionProps = {
  cotizacion: Cotizacion;
};

function countFeatures(cotizacion: Cotizacion) {
  return cotizacion.modulos.reduce((total, modulo) => total + Math.max(modulo.features.length, 1), 0);
}

function getModulesCount(cotizacion: Cotizacion) {
  return cotizacion.modulos.length;
}

export function ResumenAceptacion({ cotizacion }: ResumenAceptacionProps) {
  const featureCount = countFeatures(cotizacion);
  const modulesCount = getModulesCount(cotizacion);
  const hasMaintenance = (cotizacion.mantenimiento_mensual ?? 0) > 0;

  return (
    <Card
      padding="lg"
      className="space-y-4 border border-signal/20 bg-signal-light shadow-none"
    >
      <div className="space-y-1">
        <h3 className="text-base font-title text-carbon">
          Al aceptar esta cotización se va a crear:
        </h3>
        <p className="text-sm text-graphite">
          La cascada deja todo listo para arrancar el proyecto sin trabajo manual extra.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-start gap-3 rounded-card bg-white px-4 py-3">
          <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-signal-light text-signal">
            ✓
          </span>
          <p className="text-sm text-carbon">
            1 Cliente: <span className="font-label">{cotizacion.empresa}</span>
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-card bg-white px-4 py-3">
          <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-signal-light text-signal">
            ✓
          </span>
          <p className="text-sm text-carbon">
            1 Proyecto con <span className="font-label">{featureCount}</span> features en{" "}
            <span className="font-label">{modulesCount}</span> módulos
          </p>
        </div>

        {hasMaintenance ? (
          <div className="flex items-start gap-3 rounded-card bg-white px-4 py-3">
            <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-signal-light text-signal">
              ✓
            </span>
            <p className="text-sm text-carbon">
              1 Suscripción de mantenimiento <span className="font-label">(pendiente)</span>
            </p>
          </div>
        ) : null}

        <div className="flex items-start gap-3 rounded-card bg-white px-4 py-3">
          <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-signal-light text-signal">
            ✓
          </span>
          <p className="text-sm text-carbon">
            {cotizacion.hitos.length} cobros por un total de{" "}
            <span className="font-label">
              USD {Number(cotizacion.precio_total ?? 0).toLocaleString("en-US")}
            </span>
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-card bg-white px-4 py-3">
          <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-signal-light text-signal">
            ✓
          </span>
          <p className="text-sm text-carbon">1 link público de roadmap</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="signal">Cascada automática</Badge>
        <Badge variant="default">Cliente</Badge>
        <Badge variant="default">Proyecto</Badge>
        <Badge variant="default">Cobros</Badge>
      </div>
    </Card>
  );
}
