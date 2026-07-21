"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { FinanzasIcon } from "@/components/icons";
import { DollarSignIcon } from "@/components/ui/icons";
import { MetricaCard } from "./MetricaCard";
import { formatFecha, formatUSD } from "@/lib/utils/formatters";
import type { ComisionListado } from "@/types/comisiones";
import type { Usuario } from "@/types/auth";

type ComisionesTablaProps = {
  comisiones: ComisionListado[];
  vendedores: Array<Pick<Usuario, "id" | "nombre" | "rol">>;
  onMarkPagada: (comision: ComisionListado) => Promise<void> | void;
};

const estadoLabels: Record<ComisionListado["estado"], string> = {
  pendiente: "Pendiente",
  pagada: "Pagada",
  cancelada: "Cancelada"
};

function estadoVariant(estado: ComisionListado["estado"]) {
  if (estado === "pagada") {
    return "success" as const;
  }

  if (estado === "cancelada") {
    return "danger" as const;
  }

  return "warning" as const;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

function isInMonth(dateString: string | null | undefined, start: Date, end: Date) {
  if (!dateString) {
    return false;
  }

  const date = new Date(dateString);
  return !Number.isNaN(date.getTime()) && date >= start && date < end;
}

export function ComisionesTabla({ comisiones, vendedores, onMarkPagada }: ComisionesTablaProps) {
  const [vendedorFilter, setVendedorFilter] = useState<string>("todos");
  const [estadoFilter, setEstadoFilter] = useState<ComisionListado["estado"] | "todos">("todos");

  const filteredComisiones = useMemo(() => {
    return comisiones.filter((comision) => {
      const matchesVendedor = vendedorFilter === "todos" || comision.vendedor_id === vendedorFilter;
      const matchesEstado = estadoFilter === "todos" || comision.estado === estadoFilter;
      return matchesVendedor && matchesEstado;
    });
  }, [comisiones, estadoFilter, vendedorFilter]);

  const start = startOfMonth(new Date());
  const end = endOfMonth(new Date());

  const pagadasMes = useMemo(
    () =>
      comisiones
        .filter((comision) => comision.estado === "pagada" && isInMonth(comision.pagada_at ?? comision.updated_at, start, end))
        .reduce((total, comision) => total + comision.monto_comision, 0),
    [comisiones, end, start]
  );

  const pendientesTotales = useMemo(
    () => comisiones.filter((comision) => comision.estado === "pendiente").reduce((total, comision) => total + comision.monto_comision, 0),
    [comisiones]
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <MetricaCard label="Comisiones pagadas del mes" value={formatUSD(pagadasMes)} icono={<FinanzasIcon />} colorIcono="success" />
        <MetricaCard
          label="Comisiones pendientes totales"
          value={formatUSD(pendientesTotales)}
          icono={<FinanzasIcon />}
          colorIcono={pendientesTotales > 0 ? "warning" : "graphite"}
        />
      </div>

      <Card padding="md" className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={vendedorFilter}
            onChange={(event) => setVendedorFilter(event.target.value)}
            className="min-w-[220px] rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
          >
            <option value="todos">Todos los vendedores</option>
            {vendedores.map((usuario) => (
              <option key={usuario.id} value={usuario.id}>
                {usuario.nombre}
              </option>
            ))}
          </select>

          <select
            value={estadoFilter}
            onChange={(event) => setEstadoFilter(event.target.value as ComisionListado["estado"] | "todos")}
            className="min-w-[180px] rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
          >
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="pagada">Pagada</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line-soft">
            <thead className="bg-paper">
              <tr className="text-left text-xs font-label uppercase tracking-[0.08em] text-graphite">
                <th className="px-4 py-3">Vendedor</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Venta</th>
                <th className="px-4 py-3">% aplicado</th>
                <th className="px-4 py-3">Comisión</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft bg-white">
              {filteredComisiones.map((comision) => {
                const vendedorNombre = vendedores.find((usuario) => usuario.id === comision.vendedor_id)?.nombre ?? comision.vendedor_nombre ?? comision.vendedor_id;

                return (
                  <tr key={comision.id}>
                    <td className="px-4 py-3 text-sm text-carbon">{vendedorNombre}</td>
                    <td className="px-4 py-3 text-sm text-graphite">
                      {comision.cliente_nombre ?? (comision.tipo === "diagnostico" ? "Lead sin cliente" : comision.cliente_id)}
                    </td>
                    <td className="px-4 py-3 text-sm font-label text-carbon">{formatUSD(comision.monto_venta)}</td>
                    <td className="px-4 py-3 text-sm text-graphite">{comision.porcentaje.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-sm font-label text-carbon">{formatUSD(comision.monto_comision)}</td>
                    <td className="px-4 py-3 text-sm text-graphite">{formatFecha(comision.created_at)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={estadoVariant(comision.estado)}>{estadoLabels[comision.estado]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {comision.estado === "pendiente" ? (
                        <Button variant="ghost" size="sm" onClick={() => void onMarkPagada(comision)}>
                          Marcar pagada
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}

              {filteredComisiones.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-graphite" colSpan={8}>
                    <EmptyState
                      icon={DollarSignIcon}
                      titulo="No hay comisiones para mostrar"
                      descripcion="Cuando haya ventas con comisión, se van a listar en esta tabla."
                      className="mx-auto max-w-xl"
                    />
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
