"use client";

import { Card, EmptyState } from "@/components/ui";
import { CheckCircleIcon } from "@/components/ui/icons";
import { formatFecha } from "@/lib/utils/formatters";
import type { DashboardRecentFeature } from "@/types/dashboard";

type FeaturesRecientesProps = {
  data: DashboardRecentFeature[];
};

export function FeaturesRecientes({ data }: FeaturesRecientesProps) {
  return (
    <Card padding="md" className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="text-base font-title text-carbon">Features completadas recientemente</h3>
          <p className="text-sm text-graphite">Últimas cinco que pasaron a lista.</p>
        </div>
      </div>

      {data.length === 0 ? (
        <EmptyState
          icon={CheckCircleIcon}
          titulo="Todavía no hay features completadas"
          descripcion="Las últimas features que pasen a lista se van a mostrar en este bloque."
        />
      ) : (
        <div className="space-y-2">
          {data.map((feature) => (
            <div
              key={feature.id}
              className="rounded-card border border-line-soft bg-white px-4 py-3 shadow-soft"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate font-label text-carbon">{feature.nombre}</p>
                  <p className="mt-0.5 truncate text-sm text-graphite">{feature.proyecto_nombre}</p>
                </div>
                <span className="shrink-0 text-xs text-graphite">{formatFecha(feature.updated_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
