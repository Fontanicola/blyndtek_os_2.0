"use client";

import { Card } from "@/components/ui";
import { ClientesIcon, DashboardIcon, FinanzasIcon, SaasIcon } from "@/components/icons";
import { MetricaCard } from "@/components/finanzas";
import type { ProductoMetricas as ProductoMetricasType } from "@/types/productos";

type ProductoMetricasProps = {
  metricas: ProductoMetricasType | null;
  loading?: boolean;
};

function MetricSkeleton() {
  return (
    <Card padding="none" className="grid gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-[118px] animate-pulse rounded-card bg-paper" />
      ))}
    </Card>
  );
}

export function ProductoMetricas({ metricas, loading = false }: ProductoMetricasProps) {
  if (loading && !metricas) {
    return <MetricSkeleton />;
  }

  if (!metricas) {
    return (
      <Card padding="md" className="border border-line-soft bg-paper">
        <p className="text-sm text-graphite">Sin datos suficientes para mostrar métricas de producto.</p>
      </Card>
    );
  }

  const churnLabel = metricas.churn_pct == null ? "Sin datos suficientes" : `${metricas.churn_pct.toFixed(1)}%`;

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      <MetricaCard label="MRR" value={metricas.mrr} icono={<FinanzasIcon />} colorIcono="signal" />
      <MetricaCard
        label="Suscriptores activos"
        value={`${metricas.suscriptores_activos}`}
        icono={<ClientesIcon />}
        colorIcono="success"
      />
      <MetricaCard
        label="Nuevos del período"
        value={`${metricas.nuevos_periodo}`}
        icono={<DashboardIcon />}
        colorIcono="signal"
      />
      <MetricaCard label="Churn %" value={churnLabel} icono={<SaasIcon />} colorIcono="danger" />
    </div>
  );
}
