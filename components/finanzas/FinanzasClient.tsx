"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";
import { Badge, Button, Card, PageSkeleton, Toast } from "@/components/ui";
import { BellIcon, DashboardIcon, FinanzasIcon } from "@/components/icons";
import { useCajas } from "@/lib/hooks/useCajas";
import { useClientes } from "@/lib/hooks/useClientes";
import { addMonths, buildMonthlyFinancialSeries, formatMonthKey, formatMonthLabel, isCobroVencido, startOfMonth } from "@/lib/finanzas";
import { getMonthHistoryItems } from "@/lib/finanzas/egresosRecurrentes";
import { fechaInputAString, fechaStringAFechaLocal, hoyLocalString } from "@/lib/utils/fechas";
import { formatARS, formatUSD } from "@/lib/utils/formatters";
import { useProyectos } from "@/lib/hooks/useProyectos";
import { useFinanzas } from "@/lib/hooks/useFinanzas";
import { ArrowLeftIcon, ArrowRightIcon, RefreshIcon, WalletIcon } from "@/components/ui/icons";
import type { Cobro } from "@/types/cobros";
import type { Egreso } from "@/types/egresos";
import type { Suscripcion } from "@/types/suscripciones";
import { CobroModal } from "./CobroModal";
import { CobrosTabla } from "./CobrosTabla";
import { EgresoModal } from "./EgresoModal";
import { EgresosTabla } from "./EgresosTabla";
import { MetricaCard } from "./MetricaCard";
import { RunwayLab } from "./RunwayLab";
import { PLChart } from "./PLChart";
import { TarjetasSeccion } from "./TarjetasSeccion";
import { ComisionesTabla } from "./ComisionesTabla";
import { TesoreriaCard } from "./TesoreriaCard";
import { SuscripcionModal } from "./SuscripcionModal";
import { SuscripcionesLista } from "./SuscripcionesLista";
import { AsesorFinancieroTab } from "./AsesorFinancieroTab";
import { PresupuestoTab } from "./PresupuestoTab";
import { CierresMensualesPanel } from "./CierresMensualesPanel";
import type { ComisionListado } from "@/types/comisiones";
import type { Usuario } from "@/types/auth";
import type { Cotizacion } from "@/types/cotizaciones";
import type { AgenteAnalisis } from "@/types/agentes";
import type { CierreMensual } from "@/types/cierres";
import type { ReactNode } from "react";

type FinanzasClientProps = {
  cotizaciones: Array<Pick<Cotizacion, "id" | "empresa" | "precio_total">>;
  asesorFinancieroAnalisis: AgenteAnalisis | null;
  cierresMensuales: CierreMensual[];
};

type TabKey = "resumen" | "cobros" | "egresos" | "presupuesto" | "suscripciones" | "comisiones" | "tesoreria" | "runway-lab" | "tarjetas" | "asesor";

type MetricCardData = {
  label: string;
  value: string;
  icono?: ReactNode;
  colorIcono?: "signal" | "success" | "danger" | "warning" | "graphite";
  description?: string;
  trend?: string;
  direction?: "up" | "down";
  status?: {
    label: string;
    variant: "default" | "signal" | "success" | "warning" | "danger" | "ghost";
  };
};

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "resumen", label: "Resumen" },
  { key: "cobros", label: "Ingresos" },
  { key: "egresos", label: "Egresos" },
  { key: "presupuesto", label: "Presupuesto" },
  { key: "suscripciones", label: "Suscripciones" },
  { key: "comisiones", label: "Comisiones" },
  { key: "tesoreria", label: "Tesorería" },
  { key: "runway-lab", label: "Runway Lab" },
  { key: "tarjetas", label: "Tarjetas" },
  { key: "asesor", label: "Asesor" }
];

function getTrendDirection(current: number, previous: number | null | undefined) {
  if (previous == null) {
    return undefined;
  }

  if (current > previous) {
    return "up" as const;
  }

  if (current < previous) {
    return "down" as const;
  }

  return undefined;
}

function addOneMonth(dateString: string) {
  const date = fechaStringAFechaLocal(dateString);
  return hoyLocalString(new Date(date.getFullYear(), date.getMonth() + 1, date.getDate()));
}

export function FinanzasClient({ cotizaciones, asesorFinancieroAnalisis, cierresMensuales }: FinanzasClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSearchParams = useMemo(() => searchParams ?? new URLSearchParams(), [searchParams]);
  const {
    cobros,
    egresos,
    egresosRecurrentesConfig,
    suscripciones,
    comisiones,
    metricas,
    config,
    tesoreria,
    loading,
    error,
    updateCobro,
    createCobro,
    updateEgreso,
    createEgreso,
    deleteEgreso,
    fetchEgresos,
    fetchMetricas,
    fetchTesoreria,
    generarEgresosRecurrentesMes,
    toggleEgresoRecurrenteMesPagado,
    updateSuscripcion,
    createSuscripcion,
    activarSuscripcion,
    updateConfig,
    generarCobrosMensuales,
    marcarVencidos,
    refreshAll
  } = useFinanzas();
  const { cajas, fetchCajas, createCaja, updateCaja, deleteCaja } = useCajas();
  const { clientes } = useClientes();
  const { proyectos } = useProyectos();
  const [usuariosComerciales, setUsuariosComerciales] = useState<Array<Pick<Usuario, "id" | "nombre" | "rol">>>([]);
  const proyectosConCliente = useMemo(
    () =>
      proyectos.map((proyecto) => ({
        ...proyecto,
        clienteNombre: clientes.find((cliente) => cliente.id === proyecto.cliente_id)?.empresa ?? null
      })),
    [clientes, proyectos]
  );
  const cajasActivas = useMemo(() => cajas.filter((caja) => caja.activa), [cajas]);

  const queryTab = currentSearchParams.get("tab") as TabKey | null;
  const initialTab = tabs.some((tab) => tab.key === queryTab) ? queryTab ?? "resumen" : "resumen";
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "warning" | "error"; visible: boolean }>({
    message: "",
    type: "info",
    visible: false
  });
  const [cobroModalOpen, setCobroModalOpen] = useState(false);
  const [egresoModalOpen, setEgresoModalOpen] = useState(false);
  const [suscripcionModalOpen, setSuscripcionModalOpen] = useState(false);
  const [ingresosMonth, setIngresosMonth] = useState(formatMonthKey(new Date()));
  const [egresosMonth, setEgresosMonth] = useState(formatMonthKey(new Date()));
  const [selectedCobro, setSelectedCobro] = useState<Cobro | null>(null);
  const [selectedEgreso, setSelectedEgreso] = useState<Egreso | null>(null);
  const [selectedSuscripcion, setSelectedSuscripcion] = useState<Suscripcion | null>(null);
  const [cajaInicialDraft, setCajaInicialDraft] = useState(String(config?.caja_inicial ?? 0));

  useEffect(() => {
    const nextTab = currentSearchParams.get("tab") as TabKey | null;
    if (nextTab && tabs.some((tab) => tab.key === nextTab)) {
      setActiveTab(nextTab);
    }
  }, [currentSearchParams]);

  function handleTabChange(tab: TabKey) {
    setActiveTab(tab);
    const params = new URLSearchParams(currentSearchParams.toString());

    if (tab === "resumen") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }

    const query = params.toString();
    router.replace(query ? `/finanzas?${query}` : "/finanzas", { scroll: false });
  }

  useEffect(() => {
    setCajaInicialDraft(String(config?.caja_inicial ?? 0));
  }, [config?.caja_inicial]);

  useEffect(() => {
    let cancelled = false;

    async function loadUsuarios() {
      try {
        const response = await fetch("/api/usuarios");
        const payload = (await response.json()) as { data?: Array<Pick<Usuario, "id" | "nombre" | "rol">>; error?: string };

        if (!response.ok || !payload.data || cancelled) {
          return;
        }

        setUsuariosComerciales(payload.data.filter((usuario) => usuario.rol === "comercial"));
      } catch {
        if (!cancelled) {
          setUsuariosComerciales([]);
        }
      }
    }

    void loadUsuarios();

    return () => {
      cancelled = true;
    };
  }, []);

  const monthlySeries = useMemo(
    () => metricas?.historico_pl ?? buildMonthlyFinancialSeries(cobros, egresos, suscripciones, 12),
    [cobros, egresos, metricas?.historico_pl, suscripciones]
  );
  const lastSeries = monthlySeries[monthlySeries.length - 1] ?? null;
  const previousSeries = monthlySeries[monthlySeries.length - 2] ?? null;
  const plTrendDirection = getTrendDirection(lastSeries?.margen ?? 0, previousSeries?.margen);
  const runwayTrend =
    metricas?.quema_neta == null
      ? undefined
      : metricas.quema_neta < 0
        ? `Generás ${formatUSD(Math.abs(metricas.quema_neta))}/mes`
        : metricas.quema_neta > 0
          ? formatUSD(metricas.quema_neta)
          : undefined;
  const runwayTrendDirection =
    metricas?.quema_neta == null ? undefined : metricas.quema_neta < 0 ? ("up" as const) : metricas.quema_neta > 0 ? ("down" as const) : undefined;
  const runwayStatus =
    metricas?.runway_estado === "estable"
      ? { label: "Sin quema neta", variant: "success" as const }
      : metricas?.runway_estado === "agotado"
        ? { label: "Caja agotada", variant: "danger" as const }
    : metricas?.runway_estado === "normal"
          ? { label: "En curso", variant: "signal" as const }
          : undefined;
  const facturacionTotal = metricas?.facturacion_total ?? 0;
  const cajaActual = tesoreria?.balance_total ?? metricas?.caja_actual ?? 0;
  const porCobrar = (metricas?.cobros_pendientes ?? 0) + (metricas?.cobros_vencidos ?? 0);
  const cajaCardColor = cajaActual > 0 ? "success" : cajaActual < 0 ? "danger" : "warning";
  const ingresosMonthDate = useMemo(() => startOfMonth(new Date(`${ingresosMonth}-01T00:00:00`)), [ingresosMonth]);
  const ingresosMonthLabel = useMemo(() => formatMonthLabel(ingresosMonthDate), [ingresosMonthDate]);
  const egresosMonthDate = useMemo(() => startOfMonth(new Date(`${egresosMonth}-01T00:00:00`)), [egresosMonth]);
  const egresosMonthLabel = useMemo(() => formatMonthLabel(egresosMonthDate), [egresosMonthDate]);
  const egresosPreviousMonth = useMemo(() => formatMonthKey(addMonths(egresosMonthDate, -1)), [egresosMonthDate]);
  const egresosDelMes = useMemo(
    () => egresos.filter((egreso) => egreso.fecha?.startsWith(`${egresosMonth}-`)),
    [egresos, egresosMonth]
  );
  const egresosRecurrentesDelMes = useMemo(
    () => egresosDelMes.filter((egreso) => Boolean(egreso.recurrente_config_id)),
    [egresosDelMes]
  );
  const egresosNoRecurrentesDelMes = useMemo(
    () => egresosDelMes.filter((egreso) => !egreso.recurrente_config_id),
    [egresosDelMes]
  );
  const pagadoMes = useMemo(
    () => egresosDelMes.filter((egreso) => egreso.pagado).reduce((total, egreso) => total + egreso.monto, 0),
    [egresosDelMes]
  );
  const pendienteMes = useMemo(
    () => egresosDelMes.filter((egreso) => !egreso.pagado).reduce((total, egreso) => total + egreso.monto, 0),
    [egresosDelMes]
  );
  const vencidoMes = useMemo(
    () => egresosDelMes.filter((egreso) => !egreso.pagado && egreso.fecha < hoyLocalString()).reduce((total, egreso) => total + egreso.monto, 0),
    [egresosDelMes]
  );
  const totalEgresosMes = useMemo(() => egresosDelMes.reduce((total, egreso) => total + egreso.monto, 0), [egresosDelMes]);
  const totalEgresosRecurrentesMes = useMemo(() => egresosRecurrentesDelMes.reduce((total, egreso) => total + egreso.monto, 0), [egresosRecurrentesDelMes]);
  const totalEgresosNoRecurrentesMes = useMemo(() => egresosNoRecurrentesDelMes.reduce((total, egreso) => total + egreso.monto, 0), [egresosNoRecurrentesDelMes]);
  const totalEgresosMesAnterior = useMemo(
    () => egresos.filter((egreso) => egreso.fecha?.startsWith(`${egresosPreviousMonth}-`)).reduce((total, egreso) => total + egreso.monto, 0),
    [egresos, egresosPreviousMonth]
  );
  const desvioMesPct =
    totalEgresosMesAnterior > 0 ? ((totalEgresosMes - totalEgresosMesAnterior) / totalEgresosMesAnterior) * 100 : null;
  const cobrosDelMes = useMemo(() => {
    const getCobroMonthKey = (cobro: Cobro) =>
      cobro.fecha_vencimiento?.slice(0, 7) || cobro.fecha_cobro?.slice(0, 7) || cobro.fecha_emision?.slice(0, 7) || null;

    return cobros
      .filter((cobro) => getCobroMonthKey(cobro) === ingresosMonth)
      .sort((first, second) => {
        const firstDate = first.fecha_vencimiento ?? first.fecha_emision ?? first.created_at;
        const secondDate = second.fecha_vencimiento ?? second.fecha_emision ?? second.created_at;
        return firstDate.localeCompare(secondDate);
      });
  }, [cobros, ingresosMonth]);
  const ingresosCobradosMes = useMemo(
    () => cobrosDelMes.filter((cobro) => cobro.estado === "cobrado").reduce((total, cobro) => total + cobro.monto, 0),
    [cobrosDelMes]
  );
  const ingresosPendientesMes = useMemo(
    () => cobrosDelMes.filter((cobro) => cobro.estado !== "cobrado" && !isCobroVencido(cobro)).reduce((total, cobro) => total + cobro.monto, 0),
    [cobrosDelMes]
  );
  const ingresosVencidosMes = useMemo(
    () => cobrosDelMes.filter((cobro) => cobro.estado !== "cobrado" && isCobroVencido(cobro)).reduce((total, cobro) => total + cobro.monto, 0),
    [cobrosDelMes]
  );
  const historialRecurrenteSeleccionado = useMemo(
    () =>
      selectedEgreso?.recurrente_config_id
        ? getMonthHistoryItems(egresosMonth, egresos, selectedEgreso.recurrente_config_id, 12)
        : [],
    [egresosMonth, egresos, selectedEgreso?.recurrente_config_id]
  );

  function showToast(message: string, type: "success" | "info" | "warning" | "error" = "info") {
    setToast({ message, type, visible: true });
  }

  function hideToast() {
    setToast((current) => ({ ...current, visible: false }));
  }

  const ensureEgresosMonthGenerated = useCallback(async (targetMonth: string) => {
    const hasMissingInstances = egresosRecurrentesConfig.some(
      (config) =>
        config.activo &&
        config.fecha_inicio.slice(0, 7) <= targetMonth &&
        !egresos.some((egreso) => egreso.recurrente_config_id === config.id && egreso.fecha?.startsWith(`${targetMonth}-`))
    );

    if (!hasMissingInstances) {
      return;
    }

    const result = await generarEgresosRecurrentesMes(targetMonth);
    if (result.generados > 0) {
      await Promise.all([fetchEgresos(), fetchMetricas(), fetchTesoreria()]);
    }
  }, [egresos, egresosRecurrentesConfig, fetchEgresos, fetchMetricas, fetchTesoreria, generarEgresosRecurrentesMes]);

  async function handleMarkCobrado(cobro: Cobro) {
    try {
      await updateCobro(cobro.id, { estado: "cobrado", fecha_cobro: hoyLocalString() });
      showToast("Cobro marcado como cobrado.", "success");
      void refreshAll();
    } catch (mutationError) {
      showToast(mutationError instanceof Error ? mutationError.message : "No se pudo actualizar el cobro.", "error");
    }
  }

  async function handleToggleEgresoPagado(egreso: Egreso) {
    try {
      await updateEgreso(egreso.id, {
        pagado: !egreso.pagado,
        fecha_pago: !egreso.pagado ? hoyLocalString() : null
      });
      showToast(egreso.pagado ? "Egreso marcado como pendiente." : "Egreso marcado como pagado.", "success");
      void refreshAll();
    } catch (mutationError) {
      showToast(mutationError instanceof Error ? mutationError.message : "No se pudo actualizar el egreso.", "error");
    }
  }

  async function handleToggleHistorialRecurrente(month: string, pagado: boolean) {
    if (!selectedEgreso?.recurrente_config_id) {
      return;
    }

    try {
      await toggleEgresoRecurrenteMesPagado(selectedEgreso.recurrente_config_id, month, pagado);
      await Promise.all([fetchEgresos(), fetchMetricas(), fetchTesoreria()]);
      showToast(pagado ? "Mes marcado como pagado." : "Mes marcado como pendiente.", "success");
    } catch (mutationError) {
      showToast(mutationError instanceof Error ? mutationError.message : "No se pudo actualizar el historial de pagos.", "error");
    }
  }

  useEffect(() => {
    if (activeTab !== "egresos" || loading) {
      return;
    }

    void ensureEgresosMonthGenerated(egresosMonth).catch((error) => {
      showToast(error instanceof Error ? error.message : "No se pudieron generar los egresos recurrentes del mes.", "error");
    });
  }, [activeTab, egresosMonth, ensureEgresosMonthGenerated, loading]);

  async function handleMarkSuscripcionCobrado(suscripcion: Suscripcion, cobro: Cobro | null) {
    try {
      const fechaCobro = hoyLocalString();

      if (cobro) {
        await updateCobro(cobro.id, {
          estado: "cobrado",
          fecha_cobro: fechaCobro,
          cuenta_medio: cobro.cuenta_medio ?? cajasActivas[0]?.slug ?? null
        });
      } else {
        await createCobro({
          cliente_id: suscripcion.cliente_id,
          proyecto_id: suscripcion.proyecto_id,
          suscripcion_id: suscripcion.id,
          cotizacion_id: suscripcion.cotizacion_id,
          concepto: `Cobro de ${suscripcion.tipo}`,
          tipo: suscripcion.tipo === "brick" ? "brick" : "mantenimiento",
          monto: suscripcion.monto_mensual,
          fecha_emision: fechaInputAString(fechaCobro),
          fecha_vencimiento: suscripcion.proxima_cobro ?? fechaInputAString(fechaCobro),
          fecha_cobro: fechaInputAString(fechaCobro),
          cuenta_medio: null,
          tolerancia_dias: 0,
          estado: "cobrado"
        });
      }

      await updateSuscripcion(suscripcion.id, {
        proxima_cobro: suscripcion.proxima_cobro ? addOneMonth(suscripcion.proxima_cobro) : addOneMonth(fechaCobro)
      });
      showToast("Cobro registrado correctamente.", "success");
      void refreshAll();
    } catch (mutationError) {
      showToast(mutationError instanceof Error ? mutationError.message : "No se pudo registrar el cobro.", "error");
    }
  }

  async function handleMarkComisionPagada(comision: ComisionListado) {
    try {
      const response = await fetch(`/api/comisiones/${comision.id}/marcar-pagada`, {
        method: "POST"
      });
      const payload = (await response.json()) as { data?: unknown; error?: string };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo marcar la comisión como pagada.");
      }

      showToast("Comisión marcada como pagada y egreso generado.", "success");
      void refreshAll();
    } catch (mutationError) {
      showToast(mutationError instanceof Error ? mutationError.message : "No se pudo pagar la comisión.", "error");
    }
  }

  async function exportPLToExcel() {
    const workbook = XLSX.utils.book_new();
    const sheetData = monthlySeries.map((point) => ({
      Mes: point.label,
      Ingresos: point.ingresos,
      Egresos: point.egresos,
      Margen: point.margen,
      "Clientes activos": point.clientes_activos
    }));

    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "P&L");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "blyndtek-pl.xlsx";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const metricCards: MetricCardData[] = [
    {
      label: "Ingreso recurrente actual",
      value: formatUSD(metricas?.mrr ?? 0),
      icono: <FinanzasIcon />,
      colorIcono: "signal",
      trend: undefined,
      direction: undefined
    },
    {
      label: "Runway",
      value:
        metricas?.runway_estado === "estable"
          ? "Estable"
          : metricas?.runway_estado === "agotado"
            ? "Caja agotada"
              : metricas?.runway_meses == null
                ? "No disponible"
                : `${metricas.runway_meses.toFixed(1)} ${metricas.runway_meses === 1 ? "mes" : "meses"}`,
      icono: <DashboardIcon />,
      colorIcono:
        metricas?.runway_estado === "estable"
          ? "success"
          : metricas?.runway_estado === "agotado"
            ? "danger"
            : "warning",
      trend: runwayTrend,
      direction: runwayTrendDirection,
      status: runwayStatus
    },
    {
      label: "Facturación total",
      value: formatUSD(facturacionTotal),
      icono: <FinanzasIcon />,
      colorIcono: "signal",
      trend: undefined,
      direction: undefined
    },
    {
      label: "Caja actual",
      value: formatUSD(cajaActual),
      icono: <FinanzasIcon />,
      colorIcono: cajaCardColor,
      description: `${formatUSD(porCobrar)} por cobrar`,
      trend: undefined,
      direction: undefined
    },
    {
      label: "Resultado del mes",
      value: formatUSD(metricas?.pl_mes ?? 0),
      icono: <FinanzasIcon />,
      colorIcono: "signal",
      trend: undefined,
      direction: plTrendDirection
    }
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={
                activeTab === tab.key
                  ? "rounded-pill bg-signal-light px-4 py-2 text-sm font-label text-signal"
                  : "rounded-pill bg-white px-4 py-2 text-sm font-label text-graphite transition-colors duration-fast ease-fast hover:text-carbon"
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === "egresos" ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setSelectedEgreso(null);
                setEgresoModalOpen(true);
              }}
            >
              Cargar egreso
            </Button>
          ) : null}
          <Button variant="secondary" size="sm" onClick={() => void exportPLToExcel()}>
            Exportar resultado a Excel
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void refreshAll()}>
            Refrescar
          </Button>
        </div>
      </div>

      {loading ? <PageSkeleton rows={7} kpis={4} /> : null}

      {error ? (
        <Card padding="md" className="flex-shrink-0 border border-danger/20 bg-danger-light">
          <p className="text-sm text-danger">{error}</p>
        </Card>
      ) : null}

      <div className="flex-1 min-h-0">
        {activeTab === "resumen" ? (
        <div className="flex flex-col gap-6">
          <div className="overflow-x-auto pb-1">
            <div className="grid min-w-[1120px] grid-cols-5 gap-4">
              {metricCards.map((card) => (
                <MetricaCard
                  key={card.label}
                  label={card.label}
                  value={card.value}
                  icono={card.icono}
                  colorIcono={card.colorIcono}
                  description={card.description}
                  trend={card.trend}
                  direction={card.direction}
                  status={card.status}
                />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <PLChart data={monthlySeries} />
          </div>

          <CierresMensualesPanel initialCierres={cierresMensuales} />

        </div>
        ) : null}

        {activeTab === "cobros" ? (
        <div className="flex flex-col gap-6">
          <Card padding="md" className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-label text-graphite">Mes seleccionado</p>
              <h3 className="text-xl font-title text-carbon">{ingresosMonthLabel}</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIngresosMonth(formatMonthKey(addMonths(ingresosMonthDate, -1)))}>
                <ArrowLeftIcon size={16} />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIngresosMonth(formatMonthKey(addMonths(ingresosMonthDate, 1)))}>
                <ArrowRightIcon size={16} />
              </Button>
            </div>
          </Card>
          <div className="grid gap-4 md:grid-cols-3">
            <MetricaCard
              label="Cobrado este mes"
              value={formatARS(ingresosCobradosMes)}
              icono={<FinanzasIcon />}
              colorIcono="success"
            />
            <MetricaCard
              label="Pendiente este mes"
              value={formatARS(ingresosPendientesMes)}
              icono={<FinanzasIcon />}
              colorIcono={ingresosPendientesMes > 0 ? "warning" : "graphite"}
            />
            <MetricaCard
              label="Con atraso"
              value={formatARS(ingresosVencidosMes)}
              icono={<BellIcon />}
              colorIcono={ingresosVencidosMes > 0 ? "danger" : "graphite"}
            />
          </div>
          <CobrosTabla
            cobros={cobrosDelMes}
            cajas={cajas}
            onMarkCobrado={handleMarkCobrado}
            onNew={() => {
              setSelectedCobro(null);
              setCobroModalOpen(true);
            }}
            onEdit={(cobro) => {
              setSelectedCobro(cobro);
              setCobroModalOpen(true);
            }}
          />
        </div>
        ) : null}

        {activeTab === "egresos" ? (
        <div className="flex flex-col gap-6">
          <Card padding="md" className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-label text-graphite">Mes seleccionado</p>
              <h3 className="text-xl font-title text-carbon">{egresosMonthLabel}</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEgresosMonth(formatMonthKey(addMonths(egresosMonthDate, -1)))}>
                <ArrowLeftIcon size={16} />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEgresosMonth(formatMonthKey(addMonths(egresosMonthDate, 1)))}>
                <ArrowRightIcon size={16} />
              </Button>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-5">
            <MetricaCard label="Pagado este mes (pesos)" value={formatARS(pagadoMes)} icono={<WalletIcon />} colorIcono="success" />
            <MetricaCard label="Pendiente este mes (pesos)" value={formatARS(pendienteMes)} icono={<WalletIcon />} colorIcono="warning" />
            <MetricaCard label="Recurrentes (pesos)" value={formatARS(totalEgresosRecurrentesMes)} icono={<RefreshIcon />} colorIcono="signal" />
            <MetricaCard label="No recurrentes (pesos)" value={formatARS(totalEgresosNoRecurrentesMes)} icono={<WalletIcon />} colorIcono="danger" />
            <MetricaCard
              label="Desvío vs. mes anterior"
              value={desvioMesPct == null ? "Sin base" : `${desvioMesPct >= 0 ? "+" : ""}${desvioMesPct.toFixed(1)}%`}
              icono={<FinanzasIcon />}
              colorIcono={desvioMesPct == null ? "graphite" : desvioMesPct > 0 ? "danger" : desvioMesPct < 0 ? "success" : "graphite"}
              description={`${formatARS(totalEgresosMes)} vs. ${formatARS(totalEgresosMesAnterior)}`}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-title text-carbon">Recurrentes</h3>
                <p className="text-sm text-graphite">Instancias reales del mes vinculadas a su plantilla activa.</p>
              </div>
              <Badge variant="default">{egresosRecurrentesDelMes.length}</Badge>
            </div>
            <EgresosTabla
              egresos={egresosRecurrentesDelMes}
              cajas={cajas}
              showRecurrenteColumn={false}
              emptyTitle="No hay recurrentes para este mes"
              emptyDescription="Cuando una plantilla activa tenga instancia para este mes, va a aparecer en esta sección."
              onTogglePagado={handleToggleEgresoPagado}
              onEdit={(egreso) => {
                setSelectedEgreso(egreso);
                setEgresoModalOpen(true);
              }}
              onDelete={async (egreso) => {
                try {
                  await deleteEgreso(egreso.id);
                  showToast("Egreso eliminado.", "success");
                  void refreshAll();
                } catch (mutationError) {
                  showToast(mutationError instanceof Error ? mutationError.message : "No se pudo eliminar el egreso.", "error");
                }
              }}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-title text-carbon">No recurrentes</h3>
                <p className="text-sm text-graphite">Costos puntuales cargados manualmente para este mes.</p>
              </div>
              <Badge variant="default">{egresosNoRecurrentesDelMes.length}</Badge>
            </div>
            <EgresosTabla
              egresos={egresosNoRecurrentesDelMes}
              cajas={cajas}
              showRecurrenteColumn={false}
              emptyTitle="No hay egresos puntuales para este mes"
              emptyDescription="Los costos no recurrentes cargados manualmente van a aparecer en esta sección."
              onTogglePagado={handleToggleEgresoPagado}
              onEdit={(egreso) => {
                setSelectedEgreso(egreso);
                setEgresoModalOpen(true);
              }}
              onDelete={async (egreso) => {
                try {
                  await deleteEgreso(egreso.id);
                  showToast("Egreso eliminado.", "success");
                  void refreshAll();
                } catch (mutationError) {
                  showToast(mutationError instanceof Error ? mutationError.message : "No se pudo eliminar el egreso.", "error");
                }
              }}
            />
          </div>

          {vencidoMes > 0 ? (
            <Card padding="sm" className="border-danger/30 bg-danger-light">
              <p className="text-sm text-danger">Hay {formatARS(vencidoMes)} en egresos con atraso dentro de {egresosMonthLabel}.</p>
            </Card>
          ) : null}
        </div>
        ) : null}

        {activeTab === "presupuesto" ? <PresupuestoTab /> : null}

        {activeTab === "suscripciones" ? (
        <SuscripcionesLista
          suscripciones={suscripciones}
          clientes={clientes.map((cliente) => ({ id: cliente.id, empresa: cliente.empresa }))}
          cotizaciones={cotizaciones}
          cobros={cobros}
          onActivate={async (suscripcion) => {
            try {
              await activarSuscripcion(suscripcion.id);
              showToast("Suscripción activada y primer cobro generado.", "success");
              void refreshAll();
            } catch (mutationError) {
              showToast(mutationError instanceof Error ? mutationError.message : "No se pudo activar la suscripción.", "error");
            }
          }}
          onNew={() => {
            setSelectedSuscripcion(null);
            setSuscripcionModalOpen(true);
          }}
          onMarkCobrado={handleMarkSuscripcionCobrado}
          onEdit={(suscripcion) => {
            setSelectedSuscripcion(suscripcion);
            setSuscripcionModalOpen(true);
          }}
          onGenerateMonthly={async () => {
            try {
              const result = await generarCobrosMensuales();
              showToast(`Se generaron ${result.generados} cobros recurrentes.`, "success");
              void refreshAll();
            } catch (mutationError) {
              showToast(mutationError instanceof Error ? mutationError.message : "No se pudieron generar los cobros del mes.", "error");
            }
          }}
          onMarkExpired={async () => {
            try {
              const result = await marcarVencidos();
              showToast(`Se marcaron ${result.vencidos} cobros con atraso.`, "success");
              void refreshAll();
            } catch (mutationError) {
              showToast(mutationError instanceof Error ? mutationError.message : "No se pudieron actualizar los cobros con atraso.", "error");
            }
          }}
        />
        ) : null}

        {activeTab === "comisiones" ? (
        <div className="flex flex-col gap-4">
          <ComisionesTabla
            comisiones={comisiones}
            vendedores={usuariosComerciales}
            onMarkPagada={handleMarkComisionPagada}
          />
        </div>
        ) : null}

        {activeTab === "tesoreria" ? (
        <TesoreriaCard
          data={tesoreria}
          cajas={cajas}
          cajaInicialDraft={cajaInicialDraft}
          onCajaInicialDraftChange={setCajaInicialDraft}
          onSaveCajaInicial={async () => {
            try {
              await updateConfig({ caja_inicial: Number(cajaInicialDraft || 0) });
              showToast("Configuración financiera actualizada.", "success");
              void refreshAll();
            } catch (mutationError) {
              showToast(
                mutationError instanceof Error ? mutationError.message : "No se pudo actualizar la configuración.",
                "error"
              );
            }
          }}
          onRefreshData={async () => {
            await fetchCajas();
            await refreshAll();
          }}
          onCreateCaja={createCaja}
          onUpdateCaja={updateCaja}
          onDeleteCaja={deleteCaja}
          onCreateCobro={createCobro}
          onCreateEgreso={createEgreso}
          clientes={clientes}
          proyectos={proyectosConCliente}
          cotizaciones={cotizaciones}
          suscripciones={suscripciones}
          showToast={showToast}
        />
        ) : null}

        {activeTab === "runway-lab" ? (
        <RunwayLab
          cajaActual={metricas?.caja_actual ?? 0}
          cobros={cobros}
          egresos={egresos}
          suscripciones={suscripciones}
          loading={loading}
          onApprove={async (hypotheses) => {
            let createdEgresos = 0;
            let affectedMonths = 0;

            for (const hypothesis of hypotheses) {
              for (const month of hypothesis.meses) {
                await createEgreso({
                  concepto: hypothesis.nombre,
                  categoria: hypothesis.categoria,
                  monto: hypothesis.monto,
                  fecha: `${month}-01`,
                  recurrente: false,
                  pagado: false,
                  fecha_pago: null,
                  cuenta_medio: null,
                  proyecto_id: null,
                  notas: null
                });
                createdEgresos += 1;
                affectedMonths += 1;
              }
            }

            showToast(`Escenario aprobado — ${createdEgresos} costos agregados en ${affectedMonths} meses`, "success");
            void refreshAll();
          }}
        />
        ) : null}

        {activeTab === "tarjetas" ? <TarjetasSeccion showToast={showToast} /> : null}

        {activeTab === "asesor" ? (
          <AsesorFinancieroTab analisisReciente={asesorFinancieroAnalisis} showToast={showToast} />
        ) : null}
      </div>

      <CobroModal
        isOpen={cobroModalOpen}
        onClose={() => {
          setCobroModalOpen(false);
          setSelectedCobro(null);
        }}
        cobro={selectedCobro}
        clientes={clientes}
        proyectos={proyectosConCliente}
        cotizaciones={cotizaciones}
        suscripciones={suscripciones}
        cajas={cajasActivas}
        onSave={async (input) => {
          try {
            if (selectedCobro) {
              await updateCobro(selectedCobro.id, input);
              showToast("Cobro actualizado correctamente.", "success");
            } else {
              await createCobro(input);
              showToast("Cobro creado correctamente.", "success");
            }
            setCobroModalOpen(false);
            setSelectedCobro(null);
            void refreshAll();
          } catch (mutationError) {
            showToast(mutationError instanceof Error ? mutationError.message : "No se pudo guardar el cobro.", "error");
          }
        }}
      />

      <EgresoModal
        isOpen={egresoModalOpen}
        onClose={() => {
          setEgresoModalOpen(false);
          setSelectedEgreso(null);
        }}
        egreso={selectedEgreso}
        proyectos={proyectosConCliente}
        cajas={cajasActivas}
        historialPagos={historialRecurrenteSeleccionado}
        onToggleHistorialPago={handleToggleHistorialRecurrente}
        onSave={async (input) => {
          try {
            if (selectedEgreso) {
              await updateEgreso(selectedEgreso.id, input);
              showToast("Egreso actualizado correctamente.", "success");
            } else {
              await createEgreso(input);
              showToast("Egreso creado correctamente.", "success");
            }
            setEgresoModalOpen(false);
            setSelectedEgreso(null);
            void refreshAll();
          } catch (mutationError) {
            showToast(mutationError instanceof Error ? mutationError.message : "No se pudo guardar el egreso.", "error");
          }
        }}
      />

      <SuscripcionModal
        isOpen={suscripcionModalOpen}
        onClose={() => {
          setSuscripcionModalOpen(false);
          setSelectedSuscripcion(null);
        }}
        suscripcion={selectedSuscripcion}
        clientes={clientes}
        proyectos={proyectosConCliente}
        cotizaciones={cotizaciones}
        onSave={async (input) => {
          try {
            if (selectedSuscripcion) {
              await updateSuscripcion(selectedSuscripcion.id, input);
              showToast("Suscripción actualizada correctamente.", "success");
            } else {
              await createSuscripcion(input);
              showToast("Suscripción creada correctamente.", "success");
            }
            setSuscripcionModalOpen(false);
            setSelectedSuscripcion(null);
            void refreshAll();
          } catch (mutationError) {
            showToast(mutationError instanceof Error ? mutationError.message : "No se pudo guardar la suscripción.", "error");
          }
        }}
      />

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
    </div>
  );
}
