"use client";

import { Button } from "@/components/ui";
import { ETAPA_LABELS, OUTBOUND_ETAPAS } from "@/lib/leads";
import type { EtapaLead, NivelConfianza } from "@/types/leads";

type InboundFiltrosState = {
  nivel_confianza?: NivelConfianza;
  etapa?: EtapaLead;
};

type InboundFiltrosProps = {
  filtros: InboundFiltrosState;
  onChange: (filtros: InboundFiltrosState) => void;
};

const selectClassName =
  "h-10 rounded-component border border-line bg-white px-3 text-sm text-carbon transition-all duration-fast ease-fast focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20";

export function InboundFiltros({ filtros, onChange }: InboundFiltrosProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-card bg-white p-4 shadow-soft">
      <select
        value={filtros.nivel_confianza ?? ""}
        onChange={(event) =>
          onChange({
            ...filtros,
            nivel_confianza: (event.target.value || undefined) as NivelConfianza | undefined
          })
        }
        className={selectClassName}
      >
        <option value="">Todos los niveles</option>
        <option value="alto">Alto</option>
        <option value="medio">Medio</option>
        <option value="bajo">Bajo</option>
      </select>

      <select
        value={filtros.etapa ?? ""}
        onChange={(event) =>
          onChange({
            ...filtros,
            etapa: (event.target.value || undefined) as EtapaLead | undefined
          })
        }
        className={selectClassName}
      >
        <option value="">Todas las etapas</option>
        {OUTBOUND_ETAPAS.map((etapa) => (
          <option key={etapa} value={etapa}>
            {ETAPA_LABELS[etapa]}
          </option>
        ))}
      </select>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange({})}
      >
        Limpiar
      </Button>
    </div>
  );
}
