"use client";

import { EntitySelect } from "@/components/ui";
import { cn } from "@/lib/cn";

export type NotaVinculoTipo = "ninguna" | "cliente" | "proyecto" | "lead";

export type NotaVinculoValue = {
  tipo: NotaVinculoTipo;
  id: string | null;
};

type VincularEntidadSelectProps = {
  value: NotaVinculoValue;
  onChange: (value: NotaVinculoValue) => void;
  clientes: Array<{ id: string; empresa: string }>;
  proyectos: Array<{ id: string; nombre: string; clienteNombre?: string | null }>;
  leads: Array<{ id: string; empresa: string; canal?: string | null; etapa?: string | null }>;
  className?: string;
};

const tipoLabels: Record<NotaVinculoTipo, string> = {
  ninguna: "Sin vínculo",
  cliente: "Cliente",
  proyecto: "Proyecto",
  lead: "Lead"
};

export function VincularEntidadSelect({
  value,
  onChange,
  clientes,
  proyectos,
  leads,
  className
}: VincularEntidadSelectProps) {
  const options = {
    cliente: clientes.map((cliente) => ({ id: cliente.id, label: cliente.empresa })),
    proyecto: proyectos.map((proyecto) => ({
      id: proyecto.id,
      label: proyecto.nombre,
      sublabel: proyecto.clienteNombre ? `Cliente: ${proyecto.clienteNombre}` : undefined
    })),
    lead: leads.map((lead) => ({
      id: lead.id,
      label: lead.empresa,
      sublabel: [lead.canal, lead.etapa].filter(Boolean).join(" · ") || undefined
    }))
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-1">
        <label className="block text-sm font-label text-carbon">Vincular a</label>
        <select
          value={value.tipo}
          onChange={(event) => {
            const nextTipo = event.target.value as NotaVinculoTipo;
            onChange({
              tipo: nextTipo,
              id: nextTipo === "ninguna" ? null : null
            });
          }}
          className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon transition-all duration-fast ease-fast focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
        >
          {Object.entries(tipoLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {value.tipo !== "ninguna" ? (
        <EntitySelect
          label={tipoLabels[value.tipo]}
          value={value.id}
          allowEmpty
          placeholder={`Seleccionar ${tipoLabels[value.tipo].toLowerCase()}`}
          options={options[value.tipo]}
          onChange={(id) => onChange({ ...value, id })}
        />
      ) : null}
    </div>
  );
}
