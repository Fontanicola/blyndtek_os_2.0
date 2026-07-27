"use client";

import { useMemo, useState } from "react";
import { Badge, Button, EmptyState, OverdueIndicator, Toolbar, DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow, RowActions } from "@/components/ui";
import { DollarSignIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { formatCajaLabel } from "@/lib/cajas";
import { isCobroVencido } from "@/lib/finanzas";
import { formatearFechaDisplay } from "@/lib/utils/fechas";
import { formatUSD } from "@/lib/utils/formatters";
import { labelEstado } from "@/lib/ui/labels";
import type { Caja } from "@/types/cajas";
import type { Cobro, EstadoCobro } from "@/types/cobros";

type CobrosTablaProps = {
  cobros: Cobro[];
  cajas?: Caja[];
  onMarkCobrado: (cobro: Cobro) => Promise<void> | void;
  onNew: () => void;
  onEdit?: (cobro: Cobro) => void;
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
  if (tipo === "otro") {
    return "Otro";
  }
  if (tipo === "mantenimiento") {
    return "Mantenimiento";
  }
  if (tipo === "brick") {
    return "Brick";
  }
  if (tipo === "diagnostico") {
    return "Diagnóstico";
  }
  return "Hito";
}

export function CobrosTabla({ cobros, cajas = [], onMarkCobrado, onNew, onEdit }: CobrosTablaProps) {
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
      <Toolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar ingresos"
        filterCount={(estadoFilter !== "todos" ? 1 : 0) + (tipoFilter !== "todos" ? 1 : 0)}
        filterContent={
          <div className="grid gap-3">
          <select
            value={estadoFilter}
            onChange={(event) => setEstadoFilter(event.target.value as EstadoCobro | "todos")}
            className="rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
          >
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="facturado">Facturado</option>
            <option value="cobrado">Cobrado</option>
            <option value="vencido">Con atraso</option>
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
            <option value="diagnostico">Diagnóstico</option>
            <option value="otro">Otro</option>
          </select>
          </div>
        }
        primaryAction={<Button variant="primary" size="sm" onClick={onNew}>Nuevo ingreso</Button>}
      />

      <DataTable>
            <DataTableHeader><tr>
                <DataTableHead>Concepto</DataTableHead><DataTableHead>Cliente</DataTableHead><DataTableHead>Tipo</DataTableHead><DataTableHead>Emisión</DataTableHead><DataTableHead>Monto</DataTableHead><DataTableHead>Vencimiento</DataTableHead><DataTableHead>Caja</DataTableHead><DataTableHead>Estado</DataTableHead><DataTableHead className="text-right">Acciones</DataTableHead>
            </tr></DataTableHeader>
            <DataTableBody>
              {filteredCobros.map((cobro) => {
                const isDue = isCobroVencido(cobro);

                return (
                  <DataTableRow key={cobro.id} className={cn(isDue && "bg-danger-light/40")}>
                    <DataTableCell>
                      <button
                        type="button"
                        onClick={() => onEdit?.(cobro)}
                        className="text-left text-sm font-label text-carbon transition-colors duration-fast ease-fast hover:text-signal"
                      >
                        {cobro.concepto}
                      </button>
                    </DataTableCell>
                    <DataTableCell>
                      {cobro.cliente?.empresa ?? cobro.cliente_id}
                    </DataTableCell>
                    <DataTableCell>{getTipoLabel(cobro.tipo)}</DataTableCell>
                    <DataTableCell className="whitespace-nowrap">{formatearFechaDisplay(cobro.fecha_emision)}</DataTableCell>
                    <DataTableCell className="whitespace-nowrap font-label text-carbon">{formatUSD(cobro.monto)}</DataTableCell>
                    <DataTableCell className="whitespace-nowrap">{formatearFechaDisplay(cobro.fecha_vencimiento)}</DataTableCell>
                    <DataTableCell>
                      {cobro.caja_id
                        ? cajas.find((item) => item.id === cobro.caja_id)?.nombre ?? formatCajaLabel(cobro.cuenta_medio, cajas)
                        : cobro.cuenta_medio
                          ? formatCajaLabel(cobro.cuenta_medio, cajas)
                          : "Sin caja"}
                    </DataTableCell>
                    <DataTableCell>
                      <span className="inline-flex items-center gap-1"><Badge variant={getEstadoVariant(cobro.estado)}>{labelEstado(cobro.estado)}</Badge>{cobro.estado === "vencido" || isDue ? <OverdueIndicator /> : null}</span>
                    </DataTableCell>
                    <DataTableCell className="text-right">
                      <RowActions actions={[
                        ...(onEdit ? [{ kind: "edit" as const, label: "Editar", onClick: () => onEdit(cobro) }] : []),
                        ...(cobro.estado !== "cobrado" ? [{ kind: "update" as const, label: "Marcar cobrado", onClick: () => onMarkCobrado(cobro) }] : [])
                      ]} />
                    </DataTableCell>
                  </DataTableRow>
                );
              })}
              {filteredCobros.length === 0 ? (
                  <DataTableRow>
                    <DataTableCell className="py-8 text-center" colSpan={9}>
                      <EmptyState
                        icon={DollarSignIcon}
                        titulo="No hay ingresos para mostrar"
                        descripcion="Ajustá los filtros o cargá un ingreso para completar esta vista."
                        accion={{ label: "Nuevo ingreso", onClick: onNew }}
                        className="mx-auto max-w-xl"
                      />
                    </DataTableCell>
                </DataTableRow>
              ) : null}
            </DataTableBody>
      </DataTable>
    </div>
  );
}
