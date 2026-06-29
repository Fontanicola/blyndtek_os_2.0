"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card, Input } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatFecha, formatUSD } from "@/lib/utils/formatters";
import type { Cobro, EstadoCobro } from "@/types/cobros";

type CobrosTablaProps = {
  cobros: Cobro[];
  onMarkCobrado: (cobro: Cobro) => Promise<void> | void;
  onNew: () => void;
  onEdit?: (cobro: Cobro) => void;
};

const estadoLabels: Record<EstadoCobro, string> = {
  pendiente: "Pendiente",
  facturado: "Facturado",
  cobrado: "Cobrado",
  vencido: "Vencido"
};

function getEstadoVariant(estado: EstadoCobro) {
  if (estado === "cobrado") {
    return "success" as const;
  }

  if (estado === "vencido") {
    return "danger" as const;
  }

  if (estado === "facturado") {
    return "signal" as const;
  }

  return "default" as const;
}

function getTipoLabel(tipo: Cobro["tipo"]) {
  if (tipo === "one_pay") {
    return "One pay";
  }
  if (tipo === "mantenimiento") {
    return "Mantenimiento";
  }
  if (tipo === "brick") {
    return "Brick";
  }
  return "Hito";
}

export function CobrosTabla({ cobros, onMarkCobrado, onNew, onEdit }: CobrosTablaProps) {
  const [estadoFilter, setEstadoFilter] = useState<EstadoCobro | "todos">("todos");
  const [tipoFilter, setTipoFilter] = useState<Cobro["tipo"] | "todos">("todos");
  const [search, setSearch] = useState("");

  const filteredCobros = useMemo(() => {
    return cobros.filter((cobro) => {
      const matchesEstado = estadoFilter === "todos" || cobro.estado === estadoFilter;
      const matchesTipo = tipoFilter === "todos" || cobro.tipo === tipoFilter;
      const matchesSearch =
        search.trim().length === 0 ||
        cobro.concepto.toLowerCase().includes(search.toLowerCase()) ||
        cobro.estado.toLowerCase().includes(search.toLowerCase());

      return matchesEstado && matchesTipo && matchesSearch;
    });
  }, [cobros, estadoFilter, search, tipoFilter]);

  return (
    <div className="space-y-4">
      <Card padding="md" className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Buscar cobros"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-w-[220px] flex-1"
          />

          <select
            value={estadoFilter}
            onChange={(event) => setEstadoFilter(event.target.value as EstadoCobro | "todos")}
            className="rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
          >
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="facturado">Facturado</option>
            <option value="cobrado">Cobrado</option>
            <option value="vencido">Vencido</option>
          </select>

          <select
            value={tipoFilter}
            onChange={(event) => setTipoFilter(event.target.value as Cobro["tipo"] | "todos")}
            className="rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
          >
            <option value="todos">Todos los tipos</option>
            <option value="one_pay">One pay</option>
            <option value="hito">Hito</option>
            <option value="mantenimiento">Mantenimiento</option>
            <option value="brick">Brick</option>
          </select>

          <Button variant="primary" size="sm" onClick={onNew}>
            Nuevo cobro
          </Button>
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line-soft">
            <thead className="bg-paper">
              <tr className="text-left text-xs font-label uppercase tracking-[0.08em] text-graphite">
                <th className="px-4 py-3">Concepto</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Monto</th>
                <th className="px-4 py-3">Vencimiento</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft bg-white">
              {filteredCobros.map((cobro) => {
                const isDue = cobro.estado !== "cobrado" && new Date(cobro.fecha_vencimiento) < new Date();

                return (
                  <tr key={cobro.id} className={cn(isDue && "bg-danger-light/40")}>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onEdit?.(cobro)}
                        className="text-left text-sm font-label text-carbon transition-colors duration-fast ease-fast hover:text-signal"
                      >
                        {cobro.concepto}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-graphite">{cobro.cliente_id}</td>
                    <td className="px-4 py-3 text-sm text-graphite">{getTipoLabel(cobro.tipo)}</td>
                    <td className="px-4 py-3 text-sm font-label text-carbon">{formatUSD(cobro.monto)}</td>
                    <td className="px-4 py-3 text-sm text-graphite">{formatFecha(cobro.fecha_vencimiento)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={getEstadoVariant(cobro.estado)}>{estadoLabels[cobro.estado]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void onMarkCobrado(cobro)}
                        disabled={cobro.estado === "cobrado"}
                      >
                        Marcar cobrado
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filteredCobros.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-graphite" colSpan={7}>
                    No hay cobros para mostrar.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
