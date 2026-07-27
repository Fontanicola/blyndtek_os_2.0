"use client";

import { useMemo } from "react";
import { Badge, EmptyState, DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow, RowActions } from "@/components/ui";
import { GlobeIcon, LandmarkIcon, MegaphoneIcon, MoreHorizontalIcon, RefreshIcon, ServerIcon, UsersIcon, WalletIcon, WrenchIcon } from "@/components/ui/icons";
import { formatCajaLabel } from "@/lib/cajas";
import { formatFecha, formatUSD } from "@/lib/utils/formatters";
import { fechaStringAFechaLocal } from "@/lib/utils/fechas";
import { cn } from "@/lib/cn";
import type { Caja } from "@/types/cajas";
import type { CategoriaEgreso, Egreso } from "@/types/egresos";

type EgresosTablaProps = { egresos: Egreso[]; cajas?: Caja[]; onEdit?: (egreso: Egreso) => void; onDelete?: (egreso: Egreso) => Promise<void> | void; onTogglePagado?: (egreso: Egreso) => Promise<void> | void; showRecurrenteColumn?: boolean; emptyTitle?: string; emptyDescription?: string };
const categorias: Array<{ value: CategoriaEgreso; label: string; Icon: typeof GlobeIcon }> = [
  { value: "dominios", label: "Dominios", Icon: GlobeIcon }, { value: "hosting_infraestructura", label: "Hosting/Infraestructura", Icon: ServerIcon }, { value: "herramientas_software", label: "Herramientas/Software", Icon: WrenchIcon }, { value: "marketing_ads", label: "Marketing/Ads", Icon: MegaphoneIcon }, { value: "impuestos_contable", label: "Impuestos/Contable", Icon: LandmarkIcon }, { value: "sueldos_honorarios", label: "Sueldos/Honorarios", Icon: UsersIcon }, { value: "comisiones", label: "Comisiones", Icon: WalletIcon }, { value: "otro", label: "Otro", Icon: MoreHorizontalIcon }, { value: "transferencia", label: "Transferencia", Icon: RefreshIcon }
];
function categoryMeta(value: CategoriaEgreso) { return categorias.find((item) => item.value === value) ?? { value: "otro", label: "Otro", Icon: MoreHorizontalIcon }; }
function isEgresoVencido(egreso: Egreso) { if (egreso.pagado) return false; const date = fechaStringAFechaLocal(egreso.fecha); const today = new Date(); const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()); return !Number.isNaN(date.getTime()) && date < start; }

export function EgresosTabla({ egresos, cajas = [], onEdit, onDelete, onTogglePagado, showRecurrenteColumn = true, emptyTitle = "No hay egresos cargados todavía", emptyDescription = "Los egresos operativos, recurrentes o puntuales van a aparecer en esta tabla." }: EgresosTablaProps) {
  const total = useMemo(() => egresos.reduce((sum, egreso) => sum + egreso.monto, 0), [egresos]);
  return <div className="flex h-full min-h-0 flex-col gap-4">
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-line-soft bg-white">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <DataTable className="table-fixed">
          <DataTableHeader><tr><DataTableHead className={showRecurrenteColumn ? "w-[23%]" : "w-[26%]"}>Concepto</DataTableHead><DataTableHead className="w-[19%]">Categoría</DataTableHead><DataTableHead className="w-[14%]">Estado</DataTableHead><DataTableHead className="w-[15%]">Medio</DataTableHead><DataTableHead className="w-[12%]">Monto</DataTableHead><DataTableHead className="w-[13%]">Fecha</DataTableHead>{showRecurrenteColumn ? <DataTableHead className="w-[8%]">Recurrente</DataTableHead> : null}<DataTableHead className="w-[6%] text-right"><span className="sr-only">Acciones</span></DataTableHead></tr></DataTableHeader>
          <DataTableBody>
            {egresos.map((egreso) => { const category = categoryMeta(egreso.categoria); const Icon = category.Icon; return <DataTableRow key={egreso.id} className={cn(isEgresoVencido(egreso) && "bg-danger-light")}>
              <DataTableCell className="truncate font-label text-carbon">{egreso.concepto}</DataTableCell>
              <DataTableCell><span className="inline-flex min-w-0 items-center gap-2 truncate text-carbon"><Icon size={15} className="shrink-0 text-graphite" /><span className="truncate">{category.label}</span></span></DataTableCell>
              <DataTableCell>{onTogglePagado ? <button type="button" onClick={() => void onTogglePagado(egreso)} title={egreso.pagado ? "Marcar como pendiente" : "Marcar como pagado"}><Badge variant={egreso.pagado ? "success" : "warning"}>{egreso.pagado ? "Pagado" : "Pendiente"}</Badge></button> : <Badge variant={egreso.pagado ? "success" : "warning"}>{egreso.pagado ? "Pagado" : "Pendiente"}</Badge>}</DataTableCell>
              <DataTableCell><Badge variant="default">{formatCajaLabel(egreso.cuenta_medio, cajas)}</Badge></DataTableCell>
              <DataTableCell className="whitespace-nowrap font-label text-carbon">{formatUSD(egreso.monto)}</DataTableCell>
              <DataTableCell className="whitespace-nowrap">{formatFecha(egreso.fecha)}</DataTableCell>
              {showRecurrenteColumn ? <DataTableCell>{egreso.recurrente ? "Sí" : "No"}</DataTableCell> : null}
              <DataTableCell className="text-right"><RowActions actions={[...(onEdit ? [{ kind: "edit" as const, label: "Editar", onClick: () => onEdit(egreso) }] : []), ...(onDelete ? [{ kind: "destructive" as const, label: "Eliminar", onClick: async () => { if (window.confirm("¿Eliminar este egreso?")) await onDelete(egreso); } }] : [])]} /></DataTableCell>
            </DataTableRow>; })}
            {egresos.length === 0 ? <DataTableRow><DataTableCell className="py-8 text-center" colSpan={showRecurrenteColumn ? 8 : 7}><EmptyState icon={WalletIcon} titulo={emptyTitle} descripcion={emptyDescription} className="mx-auto max-w-xl" /></DataTableCell></DataTableRow> : null}
          </DataTableBody>
        </DataTable>
      </div>
      <div className="border-t border-line-soft px-4 py-3 text-right text-sm text-graphite">Total egresos: <span className="font-label text-carbon">{formatUSD(total)}</span></div>
    </div>
  </div>;
}
