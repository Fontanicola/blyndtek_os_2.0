"use client";

import { useMemo } from "react";
import { Badge, Card, EmptyState, Modal, Spinner } from "@/components/ui";
import { formatMonthLabel } from "@/lib/finanzas";
import { useCajaMovimientos } from "@/lib/hooks/useCajaMovimientos";
import { cn } from "@/lib/cn";
import { getCajaLightBg } from "@/lib/cajas";
import { formatFecha, formatUSD } from "@/lib/utils/formatters";
import type { MovimientoCaja } from "@/types/finanzas";
import {
  AlertTriangleIcon,
  ArrowDownLeftIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  BriefcaseIcon,
  CalendarIcon,
  DollarSignIcon,
  FileTextIcon,
  GlobeIcon,
  LandmarkIcon,
  MegaphoneIcon,
  MoreHorizontalIcon,
  RefreshIcon,
  ServerIcon,
  UsersIcon,
  WalletIcon,
  WrenchIcon
} from "@/components/ui/icons";

type CajaDetalleModalProps = {
  isOpen: boolean;
  onClose: () => void;
  caja: {
    id: string | null;
    nombre: string;
    color: string;
  } | null;
};

function monthLabelFromKey(monthKey: string) {
  const [year = NaN, month = NaN] = monthKey.split("-").map(Number);
  return formatMonthLabel(new Date(year, month - 1, 1));
}

function getMovimientoMeta(movimiento: MovimientoCaja) {
  if (movimiento.tipo === "egreso") {
    switch (movimiento.categoria) {
      case "dominios":
        return { Icon: GlobeIcon, badge: "Dominios" };
      case "hosting_infraestructura":
        return { Icon: ServerIcon, badge: "Hosting" };
      case "herramientas_software":
        return { Icon: WrenchIcon, badge: "Software" };
      case "marketing_ads":
        return { Icon: MegaphoneIcon, badge: "Marketing" };
      case "impuestos_contable":
        return { Icon: LandmarkIcon, badge: "Impuestos" };
      case "sueldos_honorarios":
        return { Icon: UsersIcon, badge: "Sueldos" };
      case "comisiones":
        return { Icon: WalletIcon, badge: "Comisiones" };
      case "transferencia":
        return { Icon: RefreshIcon, badge: "Transferencia" };
      default:
        return { Icon: MoreHorizontalIcon, badge: "Otro" };
    }
  }

  switch (movimiento.cobro_tipo) {
    case "hito":
      return { Icon: BriefcaseIcon, badge: "Hito" };
    case "mantenimiento":
      return { Icon: RefreshIcon, badge: "Mantenimiento" };
    case "brick":
      return { Icon: WalletIcon, badge: "Brick" };
    case "diagnostico":
      return { Icon: FileTextIcon, badge: "Diagnóstico" };
    case "transferencia":
      return { Icon: ArrowDownLeftIcon, badge: "Transferencia" };
    case "one_pay":
    case "otro":
    default:
      return { Icon: DollarSignIcon, badge: "Ingreso" };
  }
}

function KpiMiniCard({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone: "signal" | "success" | "danger";
}) {
  return (
    <Card padding="sm" className="space-y-2">
      <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">{label}</p>
      <p
        className={cn(
          "text-xl font-title",
          tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-signal"
        )}
      >
        {formatUSD(value)}
      </p>
    </Card>
  );
}

function MovimientoRow({ movimiento }: { movimiento: MovimientoCaja }) {
  const { Icon, badge } = getMovimientoMeta(movimiento);
  const isIngreso = movimiento.tipo === "ingreso";

  return (
    <div className="flex items-start gap-3 border-b border-line-soft px-1 py-3 last:border-b-0">
      <div
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          isIngreso ? "bg-success-light text-success" : "bg-danger-light text-danger"
        )}
      >
        <Icon size={18} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-label text-carbon">{movimiento.concepto}</p>
              <Badge variant="ghost">{badge}</Badge>
              <Badge variant={isIngreso ? "success" : "default"}>{movimiento.estado}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-graphite">
              {movimiento.cliente_nombre ? <span>{movimiento.cliente_nombre}</span> : null}
              <span className="inline-flex items-center gap-1">
                <CalendarIcon size={14} />
                {formatFecha(movimiento.fecha)}
              </span>
            </div>
          </div>

          <p className={cn("shrink-0 text-sm font-title", isIngreso ? "text-success" : "text-danger")}>
            {isIngreso ? "+" : "-"}
            {formatUSD(movimiento.monto)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function CajaDetalleModal({ isOpen, onClose, caja }: CajaDetalleModalProps) {
  const cajaId = caja?.id ?? null;
  const { movimientos, resumenMes, mesSeleccionado, mesAnterior, mesSiguiente, loading } = useCajaMovimientos(cajaId);

  const monthLabel = useMemo(() => monthLabelFromKey(mesSeleccionado), [mesSeleccionado]);

  const body = cajaId ? (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={cn("h-3 w-3 rounded-full", getCajaLightBg(caja?.color ?? "signal"))} />
          <div>
            <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">Caja</p>
            <p className="mt-1 text-base font-title text-carbon">{caja?.nombre}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-pill border border-line-soft bg-white p-1">
          <button
            type="button"
            onClick={mesAnterior}
            className="flex h-8 w-8 items-center justify-center rounded-pill text-graphite transition-colors duration-fast hover:bg-paper"
            aria-label="Mes anterior"
          >
            <ArrowLeftIcon size={16} />
          </button>
          <span className="min-w-[128px] text-center text-sm font-label capitalize text-carbon">{monthLabel}</span>
          <button
            type="button"
            onClick={mesSiguiente}
            className="flex h-8 w-8 items-center justify-center rounded-pill text-graphite transition-colors duration-fast hover:bg-paper"
            aria-label="Mes siguiente"
          >
            <ArrowRightIcon size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-card border border-line-soft bg-white">
          <Spinner size="lg" color="signal" />
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <KpiMiniCard label="Ingresos" value={resumenMes?.total_ingresos ?? 0} tone="success" />
            <KpiMiniCard label="Egresos" value={resumenMes?.total_egresos ?? 0} tone="danger" />
            <KpiMiniCard label="Balance neto" value={resumenMes?.balance_neto_mes ?? 0} tone="signal" />
          </div>

          <Card padding="sm" className="overflow-hidden">
            {movimientos.length === 0 ? (
              <EmptyState
                icon={WalletIcon}
                titulo="Sin movimientos este mes"
                descripcion="Esta caja no tuvo ingresos ni egresos registrados en el período seleccionado."
                className="min-h-[220px] border-0 bg-transparent"
              />
            ) : (
              <div className="space-y-0">
                {movimientos.map((movimiento) => (
                  <MovimientoRow key={`${movimiento.tipo}-${movimiento.id}`} movimiento={movimiento} />
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  ) : (
    <EmptyState
      icon={AlertTriangleIcon}
      titulo="Caja sin identificador"
      descripcion="Los movimientos detallados solo están disponibles para cajas reales guardadas en la base."
      className="min-h-[220px]"
    />
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={caja?.nombre ?? "Detalle de movimientos"} size="xl">
      {body}
    </Modal>
  );
}
