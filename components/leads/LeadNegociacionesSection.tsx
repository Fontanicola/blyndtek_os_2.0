"use client";

import { useEffect, useState } from "react";
import { Badge, Card } from "@/components/ui";
import { formatFecha } from "@/lib/utils/formatters";
import type { Lead, LeadNegociacion } from "@/types/leads";

type LeadNegociacionesSectionProps = {
  lead: Pick<
    Lead,
    | "id"
    | "monto_propuesto_desarrollo"
    | "monto_propuesto_mensual"
    | "monto_negociado_desarrollo"
    | "monto_negociado_mensual"
    | "empresa"
  >;
};

function formatUSD(value: number | null) {
  if (value === null) {
    return "—";
  }

  return `USD ${value.toLocaleString("en-US")}`;
}

export function LeadNegociacionesSection({ lead }: LeadNegociacionesSectionProps) {
  const [negociaciones, setNegociaciones] = useState<LeadNegociacion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadNegociaciones() {
      setLoading(true);

      try {
        const response = await fetch(`/api/leads/${lead.id}/negociaciones`);
        const payload = (await response.json()) as { data?: LeadNegociacion[]; error?: string };

        if (!response.ok || !payload.data) {
          throw new Error(payload.error ?? "No se pudieron cargar las negociaciones.");
        }

        if (mounted) {
          setNegociaciones(payload.data);
        }
      } catch {
        if (mounted) {
          setNegociaciones([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadNegociaciones();

    return () => {
      mounted = false;
    };
  }, [lead.id]);

  const hasProposal =
    lead.monto_propuesto_desarrollo !== null || lead.monto_propuesto_mensual !== null;

  if (loading && negociaciones.length === 0 && !hasProposal) {
    return null;
  }

  if (negociaciones.length === 0) {
    if (!hasProposal) {
      return null;
    }

    return (
      <Card padding="md" className="space-y-2">
        <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">
          Monto propuesto original
        </p>
        <div className="text-sm text-carbon">
          <p>Desarrollo: {formatUSD(lead.monto_propuesto_desarrollo)}</p>
          <p className="mt-1">Mensual: {formatUSD(lead.monto_propuesto_mensual)}</p>
        </div>
      </Card>
    );
  }

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-title text-carbon">Historial de negociación</h3>
      <div className="space-y-3">
        {hasProposal ? (
          <Card padding="md" className="space-y-2">
            <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">
              Monto propuesto original
            </p>
            <div className="text-sm text-carbon">
              <p>Desarrollo: {formatUSD(lead.monto_propuesto_desarrollo)}</p>
              <p className="mt-1">Mensual: {formatUSD(lead.monto_propuesto_mensual)}</p>
            </div>
          </Card>
        ) : null}

        {negociaciones.map((item) => (
          <Card key={item.id} padding="md" className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-label text-carbon">
                {formatUSD(item.monto_anterior_desarrollo)} → {formatUSD(item.monto_nuevo_desarrollo)}
              </p>
              <Badge variant="default" className="text-[10px]">
                {formatFecha(item.created_at)}
              </Badge>
            </div>
            <p className="text-sm text-carbon">
              Mensual: {formatUSD(item.monto_anterior_mensual)} → {formatUSD(item.monto_nuevo_mensual)}
            </p>
            {item.nota ? <p className="text-sm text-graphite">{item.nota}</p> : null}
            <p className="text-xs text-graphite">
              {item.creado_por_usuario?.nombre ?? item.creado_por ?? "Sin autor"}
            </p>
          </Card>
        ))}
      </div>
    </section>
  );
}
