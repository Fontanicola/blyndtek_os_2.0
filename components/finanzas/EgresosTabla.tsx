"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { WalletIcon } from "@/components/ui/icons";
import { formatCajaLabel } from "@/lib/cajas";
import { formatFecha, formatUSD } from "@/lib/utils/formatters";
import { fechaStringAFechaLocal } from "@/lib/utils/fechas";
import { cn } from "@/lib/cn";
import type { Caja } from "@/types/cajas";
import type { CategoriaEgreso, Egreso } from "@/types/egresos";

type EgresosTablaProps = {
  egresos: Egreso[];
  cajas?: Caja[];
  onEdit?: (egreso: Egreso) => void;
  onDelete?: (egreso: Egreso) => Promise<void> | void;
  onTogglePagado?: (egreso: Egreso) => Promise<void> | void;
};

const categorias: Array<{ value: CategoriaEgreso; label: string }> = [
  { value: "dominios", label: "Dominios" },
  { value: "hosting_infraestructura", label: "Hosting/Infraestructura" },
  { value: "herramientas_software", label: "Herramientas/Software" },
  { value: "marketing_ads", label: "Marketing/Ads" },
  { value: "impuestos_contable", label: "Impuestos/Contable" },
  { value: "sueldos_honorarios", label: "Sueldos/Honorarios" },
  { value: "comisiones", label: "Comisiones" },
  { value: "otro", label: "Otro" }
];

function categoryLabel(value: CategoriaEgreso) {
  return categorias.find((item) => item.value === value)?.label ?? value;
}

function startOfToday() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function isEgresoVencido(egreso: Egreso) {
  if (egreso.pagado) {
    return false;
  }

  const fecha = fechaStringAFechaLocal(egreso.fecha);
  return !Number.isNaN(fecha.getTime()) && fecha < startOfToday();
}

export function EgresosTabla({ egresos, cajas = [], onEdit, onDelete, onTogglePagado }: EgresosTablaProps) {
  const total = useMemo(() => egresos.reduce((sum, egreso) => sum + egreso.monto, 0), [egresos]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRootRef.current) {
        return;
      }

      if (!menuRootRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div ref={menuRootRef}>
        <Card padding="none" className="flex h-full min-h-0 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-auto">
            <table className="min-w-full table-fixed divide-y divide-line-soft">
              <thead className="sticky top-0 z-10 bg-paper">
                <tr className="text-left text-xs font-label uppercase tracking-[0.08em] text-graphite">
                  <th className="w-[19%] px-4 py-3">Concepto</th>
                  <th className="w-[16%] px-4 py-3">Categoría</th>
                  <th className="w-[12%] px-4 py-3">Estado</th>
                  <th className="w-[16%] px-4 py-3">Medio</th>
                  <th className="w-[11%] px-4 py-3">Monto</th>
                  <th className="w-[12%] px-4 py-3">Fecha</th>
                  <th className="w-[10%] px-4 py-3">Recurrente</th>
                  <th className="w-[4%] px-2 py-3 text-right">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft bg-white">
                {egresos.map((egreso) => (
                  <tr key={egreso.id} className={cn(isEgresoVencido(egreso) && "bg-danger-light")}>
                    <td className="px-4 py-3 text-sm font-label text-carbon">{egreso.concepto}</td>
                    <td className="px-4 py-3">
                      <Badge variant="default">{categoryLabel(egreso.categoria)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {onTogglePagado ? (
                        <button
                          type="button"
                          onClick={() => void onTogglePagado(egreso)}
                          className="inline-flex"
                          title={egreso.pagado ? "Marcar como pendiente" : "Marcar como pagado"}
                        >
                          <Badge variant={egreso.pagado ? "success" : "warning"}>{egreso.pagado ? "Pagado" : "Pendiente"}</Badge>
                        </button>
                      ) : (
                        <Badge variant={egreso.pagado ? "success" : "warning"}>{egreso.pagado ? "Pagado" : "Pendiente"}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="default">{formatCajaLabel(egreso.cuenta_medio, cajas)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm font-label text-carbon">{formatUSD(egreso.monto)}</td>
                    <td className="px-4 py-3 text-sm text-graphite">{formatFecha(egreso.fecha)}</td>
                    <td className="px-4 py-3 text-sm text-graphite">{egreso.recurrente ? "Sí" : "No"}</td>
                    <td className="px-2 py-3 text-right">
                      <div className="relative inline-flex justify-end" data-egreso-actions>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 px-0 py-0"
                          onClick={() => setOpenMenuId((current) => (current === egreso.id ? null : egreso.id))}
                        >
                          ⋮
                        </Button>
                        {openMenuId === egreso.id ? (
                          <div className="absolute right-0 top-full z-20 mt-2 w-40 rounded-card border border-line bg-white p-2 shadow-modal">
                            {onEdit ? (
                              <button
                                type="button"
                                className="w-full rounded-component px-3 py-2 text-left text-sm text-carbon transition-colors duration-fast ease-fast hover:bg-paper"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  onEdit(egreso);
                                }}
                              >
                                Editar
                              </button>
                            ) : null}
                            {onDelete ? (
                              <button
                                type="button"
                                className="w-full rounded-component px-3 py-2 text-left text-sm text-danger transition-colors duration-fast ease-fast hover:bg-danger-light"
                                onClick={async () => {
                                  setOpenMenuId(null);
                                  const confirmed = window.confirm("¿Eliminar este egreso?");
                                  if (!confirmed) {
                                    return;
                                  }

                                  await onDelete(egreso);
                                }}
                              >
                                Eliminar
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {egresos.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-sm text-graphite" colSpan={8}>
                      <EmptyState
                        icon={WalletIcon}
                        titulo="No hay egresos cargados todavía"
                        descripcion="Los egresos operativos, recurrentes o puntuales van a aparecer en esta tabla."
                        className="mx-auto max-w-xl"
                      />
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="border-t border-line-soft px-4 py-3 text-right text-sm text-graphite">
            Total egresos: <span className="font-label text-carbon">{formatUSD(total)}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
