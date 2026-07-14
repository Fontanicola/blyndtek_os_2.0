"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Button, Card, Spinner, Toast } from "@/components/ui";
import { BellIcon, DashboardIcon, FinanzasIcon } from "@/components/icons";
import { useCajas } from "@/lib/hooks/useCajas";
import { useClientes } from "@/lib/hooks/useClientes";
import { buildMonthlyFinancialSeries } from "@/lib/finanzas";
import { useCotizaciones } from "@/lib/hooks/useCotizaciones";
import { formatUSD } from "@/lib/utils/formatters";
import { useProyectos } from "@/lib/hooks/useProyectos";
import { useFinanzas } from "@/lib/hooks/useFinanzas";
import type { Cobro } from "@/types/cobros";
import type { Egreso } from "@/types/egresos";
import type { Suscripcion } from "@/types/suscripciones";
import { CobroModal } from "./CobroModal";
import { CarteraClientesChart } from "./CarteraClientesChart";
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
import type { ComisionListado } from "@/types/comisiones";
import type { Usuario } from "@/types/auth";
import type { ReactNode } from "react";

type TabKey = "resumen" | "cobros" | "egresos" | "suscripciones" | "comisiones" | "tesoreria" | "runway-lab" | "tarjetas";

type MetricCardData = {
  label: string;
  value: string;
  icono?: ReactNode;
  colorIcono?: "signal" | "success" | "danger" | "warning" | "graphite";
  trend?: string;
  direction?: "up" | "down";
  status?: {
    label: string;
    variant: "default" | "signal" | "success" | "warning" | "danger" | "ghost";
  };
};

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "resumen", label: "Resumen" },
  { key: "cobros", label: "Cobros" },
  { key: "egresos", label: "Egresos" },
  { key: "suscripciones", label: "Suscripciones" },
  { key: "comisiones", label: "Comisiones" },
  { key: "tesoreria", label: "Tesorería" },
  { key: "runway-lab", label: "Runway Lab" },
  { key: "tarjetas", label: "Tarjetas" }
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
  const date = new Date(dateString);
  return new Date(date.getFullYear(), date.getMonth() + 1, date.getDate()).toISOString().slice(0, 10);
}

export function FinanzasClient() {
  const {
    cobros,
    egresos,
    suscripciones,
    comisiones,
    metricas,
    config,
    carteraClientes,
    tesoreria,
    loading,
    error,
    updateCobro,
    createCobro,
    updateEgreso,
    createEgreso,
    deleteEgreso,
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
  const { cotizaciones } = useCotizaciones();
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

  const [activeTab, setActiveTab] = useState<TabKey>("resumen");
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "warning" | "error"; visible: boolean }>({
    message: "",
    type: "info",
    visible: false
  });
  const [cobroModalOpen, setCobroModalOpen] = useState(false);
  const [egresoModalOpen, setEgresoModalOpen] = useState(false);
  const [suscripcionModalOpen, setSuscripcionModalOpen] = useState(false);
  const [selectedCobro, setSelectedCobro] = useState<Cobro | null>(null);
  const [selectedEgreso, setSelectedEgreso] = useState<Egreso | null>(null);
  const [selectedSuscripcion, setSelectedSuscripcion] = useState<Suscripcion | null>(null);
  const [cajaInicialDraft, setCajaInicialDraft] = useState(String(config?.caja_inicial ?? 0));

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

  function showToast(message: string, type: "success" | "info" | "warning" | "error" = "info") {
    setToast({ message, type, visible: true });
  }

  function hideToast() {
    setToast((current) => ({ ...current, visible: false }));
  }

  async function handleMarkCobrado(cobro: Cobro) {
    try {
      await updateCobro(cobro.id, { estado: "cobrado", fecha_cobro: new Date().toISOString().slice(0, 10) });
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
        fecha_pago: !egreso.pagado ? new Date().toISOString().slice(0, 10) : null
      });
      showToast(egreso.pagado ? "Egreso marcado como pendiente." : "Egreso marcado como pagado.", "success");
      void refreshAll();
    } catch (mutationError) {
      showToast(mutationError instanceof Error ? mutationError.message : "No se pudo actualizar el egreso.", "error");
    }
  }

  async function handleMarkSuscripcionCobrado(suscripcion: Suscripcion, cobro: Cobro | null) {
    try {
      const fechaCobro = new Date().toISOString().slice(0, 10);

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
          fecha_emision: fechaCobro,
          fecha_vencimiento: suscripcion.proxima_cobro ?? fechaCobro,
          fecha_cobro: fechaCobro,
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
      label: "MRR actual",
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
                ? "N/A"
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
      label: "Cobros pendientes",
      value: formatUSD(metricas?.cobros_pendientes ?? 0),
      icono: <FinanzasIcon />,
      colorIcono: "warning",
      trend: undefined,
      direction: undefined
    },
    {
      label: "Cobros vencidos",
      value: formatUSD(metricas?.cobros_vencidos ?? 0),
      icono: <BellIcon />,
      colorIcono: "danger",
      trend: undefined,
      direction: undefined
    },
    {
      label: "Comisiones pendientes",
      value: formatUSD(metricas?.comisiones_pendientes_usd ?? 0),
      icono: <FinanzasIcon />,
      colorIcono: (metricas?.comisiones_pendientes_usd ?? 0) > 0 ? "warning" : "graphite",
      trend: undefined,
      direction: undefined
    },
    {
      label: "P&L del mes",
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
              onClick={() => setActiveTab(tab.key)}
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
            Exportar P&L a Excel
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void refreshAll()}>
            Refrescar
          </Button>
        </div>
      </div>

      {loading ? (
        <Card padding="lg" className="flex flex-shrink-0 items-center gap-3">
          <Spinner />
          <p className="text-sm text-graphite">Cargando finanzas...</p>
        </Card>
      ) : null}

      {error ? (
        <Card padding="md" className="flex-shrink-0 border border-danger/20 bg-danger-light">
          <p className="text-sm text-danger">{error}</p>
        </Card>
      ) : null}

      <div className="flex-1 min-h-0">
        {activeTab === "resumen" ? (
        <div className="flex flex-col gap-6">
          <div className="overflow-x-auto pb-1">
            <div className="grid min-w-[1340px] grid-cols-6 gap-4">
              {metricCards.map((card) => (
                <MetricaCard
                  key={card.label}
                  label={card.label}
                  value={card.value}
                  icono={card.icono}
                  colorIcono={card.colorIcono}
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

        </div>
        ) : null}

        {activeTab === "cobros" ? (
        <div className="flex flex-col gap-6">
          <CarteraClientesChart data={carteraClientes} />
          <CobrosTabla
            cobros={cobros}
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
        <div className="flex flex-col gap-4">
          <EgresosTabla
            egresos={egresos}
            cajas={cajas}
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
        ) : null}

        {activeTab === "suscripciones" ? (
        <SuscripcionesLista
          suscripciones={suscripciones}
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
              showToast(`Se marcaron ${result.vencidos} cobros como vencidos.`, "success");
              void refreshAll();
            } catch (mutationError) {
              showToast(mutationError instanceof Error ? mutationError.message : "No se pudieron marcar los vencidos.", "error");
            }
          }}
        />
        ) : null}

        {activeTab === "comisiones" ? (
        <ComisionesTabla
          comisiones={comisiones}
          vendedores={usuariosComerciales}
          onMarkPagada={handleMarkComisionPagada}
        />
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
