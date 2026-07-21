"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState, Modal, Spinner } from "@/components/ui";
import { formatMonthLabel } from "@/lib/finanzas";
import { useCajaMovimientos } from "@/lib/hooks/useCajaMovimientos";
import { cn } from "@/lib/cn";
import { getCajaLightBg } from "@/lib/cajas";
import { fechaInputAString, hoyLocalString } from "@/lib/utils/fechas";
import { formatFecha, formatUSD } from "@/lib/utils/formatters";
import type { Caja } from "@/types/cajas";
import type { CobroModalInput } from "@/components/finanzas/CobroModal";
import type { CreateEgresoInput } from "@/types/egresos";
import type { MovimientoCaja } from "@/types/finanzas";
import type { CreateCobroInput } from "@/types/cobros";
import type { Cliente } from "@/types/clientes";
import type { Proyecto } from "@/types/proyectos";
import type { Cotizacion } from "@/types/cotizaciones";
import type { Suscripcion } from "@/types/suscripciones";
import {
  AlertTriangleIcon,
  ArrowDownLeftIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
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
import { CobroModal } from "./CobroModal";
import { EgresoModal } from "./EgresoModal";

type CajaDetalleModalProps = {
  isOpen: boolean;
  onClose: () => void;
  caja: {
    id: string | null;
    nombre: string;
    color: string;
  } | null;
  refreshKey?: number;
  onRequestTransfer?: (cajaId: string) => void;
  cajas: Caja[];
  clientes: Array<Pick<Cliente, "id" | "empresa" | "pais" | "estado">>;
  proyectos: Array<Pick<Proyecto, "id" | "nombre" | "estado" | "cliente_id"> & { clienteNombre?: string | null }>;
  cotizaciones: Array<Pick<Cotizacion, "id" | "empresa" | "precio_total">>;
  suscripciones: Array<Pick<Suscripcion, "id" | "tipo" | "estado" | "monto_mensual">>;
  onCreateCobro: (input: CreateCobroInput) => Promise<unknown>;
  onCreateEgreso: (input: CreateEgresoInput) => Promise<unknown>;
  onRefreshTesoreria: () => Promise<void> | void;
  showToast: (message: string, type?: "success" | "info" | "warning" | "error") => void;
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

export function CajaDetalleModal({
  isOpen,
  onClose,
  caja,
  refreshKey = 0,
  onRequestTransfer,
  cajas,
  clientes,
  proyectos,
  cotizaciones,
  suscripciones,
  onCreateCobro,
  onCreateEgreso,
  onRefreshTesoreria,
  showToast
}: CajaDetalleModalProps) {
  const cajaId = caja?.id ?? null;
  const { movimientos, resumenMes, mesSeleccionado, mesAnterior, mesSiguiente, fetchMovimientos, loading } = useCajaMovimientos(cajaId);
  const [cobroModalOpen, setCobroModalOpen] = useState(false);
  const [egresoModalOpen, setEgresoModalOpen] = useState(false);
  const [savingIngreso, setSavingIngreso] = useState(false);
  const [savingEgreso, setSavingEgreso] = useState(false);

  const monthLabel = useMemo(() => monthLabelFromKey(mesSeleccionado), [mesSeleccionado]);
  const canTransfer = Boolean(cajaId && cajaId !== "sin_asignar");
  const cajaReal = useMemo(() => (cajaId ? cajas.find((item) => item.id === cajaId) ?? null : null), [cajaId, cajas]);
  const canCreateMovements = Boolean(cajaReal);

  useEffect(() => {
    if (!isOpen || !cajaId) {
      return;
    }

    void fetchMovimientos(mesSeleccionado).catch(() => undefined);
  }, [cajaId, fetchMovimientos, isOpen, mesSeleccionado, refreshKey]);

  async function handleMutationSuccess(message: string) {
    await Promise.all([fetchMovimientos(mesSeleccionado).catch(() => undefined), Promise.resolve(onRefreshTesoreria())]);
    showToast(message, "success");
  }

  async function handleCreateIngreso(input: CobroModalInput) {
    try {
      setSavingIngreso(true);
      await onCreateCobro(input);
      setCobroModalOpen(false);
      await handleMutationSuccess("Ingreso creado correctamente.");
    } catch (mutationError) {
      showToast(mutationError instanceof Error ? mutationError.message : "No se pudo guardar el ingreso.", "error");
    } finally {
      setSavingIngreso(false);
    }
  }

  async function handleCreateEgreso(input: CreateEgresoInput) {
    try {
      setSavingEgreso(true);
      await onCreateEgreso(input);
      setEgresoModalOpen(false);
      await handleMutationSuccess("Egreso creado correctamente.");
    } catch (mutationError) {
      showToast(mutationError instanceof Error ? mutationError.message : "No se pudo guardar el egreso.", "error");
    } finally {
      setSavingEgreso(false);
    }
  }

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

      {canCreateMovements || (canTransfer && onRequestTransfer) ? (
        <div className="flex flex-wrap items-center gap-2 rounded-card border border-line-soft bg-paper p-3">
          {canCreateMovements ? (
            <>
              <Button variant="primary" size="sm" onClick={() => setCobroModalOpen(true)}>
                + Ingreso
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setEgresoModalOpen(true)}>
                + Egreso
              </Button>
            </>
          ) : null}
          {canTransfer && onRequestTransfer ? (
            <Button variant="secondary" size="sm" onClick={() => onRequestTransfer(cajaId)}>
              <ArrowUpRightIcon size={16} />
              Transferir desde esta caja
            </Button>
          ) : null}
        </div>
      ) : null}

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
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={caja?.nombre ?? "Detalle de movimientos"} size="xl">
        {body}
      </Modal>

      <CobroModal
        isOpen={cobroModalOpen}
        onClose={() => setCobroModalOpen(false)}
        onSave={handleCreateIngreso}
        defaults={{
          cliente_id: null,
          concepto: "",
          tipo: "otro",
          monto: 0,
          fecha_emision: hoyLocalString(),
          fecha_vencimiento: hoyLocalString(),
          fecha_cobro: null,
          caja_id: cajaReal?.id ?? null,
          cuenta_medio: cajaReal?.slug ?? null,
          tolerancia_dias: 0,
          estado: "pendiente"
        }}
        clientes={clientes}
        proyectos={proyectos}
        cotizaciones={cotizaciones}
        suscripciones={suscripciones}
        cajas={cajas.filter((item) => item.activa)}
        saving={savingIngreso}
      />

      <EgresoModal
        isOpen={egresoModalOpen}
        onClose={() => setEgresoModalOpen(false)}
        onSave={handleCreateEgreso}
        defaults={{
          concepto: "",
          categoria: "otro",
          monto: 0,
          fecha: fechaInputAString(mesSeleccionado ? `${mesSeleccionado}-01` : hoyLocalString()) || hoyLocalString(),
          caja_id: cajaReal?.id ?? null,
          cuenta_medio: cajaReal?.slug ?? null,
          pagado: false,
          fecha_pago: null,
          proyecto_id: null,
          notas: null,
          recurrente: false
        }}
        proyectos={proyectos}
        cajas={cajas.filter((item) => item.activa)}
        saving={savingEgreso}
      />
    </>
  );
}
