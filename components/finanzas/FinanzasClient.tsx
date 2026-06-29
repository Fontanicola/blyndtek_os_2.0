"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Button, Card, Input, Spinner, Toast } from "@/components/ui";
import { useClientes } from "@/lib/hooks/useClientes";
import { buildMonthlyFinancialSeries, buildRunwaySeries } from "@/lib/finanzas";
import { useCotizaciones } from "@/lib/hooks/useCotizaciones";
import { formatUSD } from "@/lib/utils/formatters";
import { useProyectos } from "@/lib/hooks/useProyectos";
import { useFinanzas } from "@/lib/hooks/useFinanzas";
import type { Cobro } from "@/types/cobros";
import type { Egreso } from "@/types/egresos";
import type { Suscripcion } from "@/types/suscripciones";
import { CobroModal } from "./CobroModal";
import { CobrosTabla } from "./CobrosTabla";
import { EgresoModal } from "./EgresoModal";
import { EgresosTabla } from "./EgresosTabla";
import { MetricaCard } from "./MetricaCard";
import { PLChart } from "./PLChart";
import { RunwayChart } from "./RunwayChart";
import { SuscripcionModal } from "./SuscripcionModal";
import { SuscripcionesLista } from "./SuscripcionesLista";

type TabKey = "resumen" | "cobros" | "egresos" | "suscripciones" | "configuracion";

type MetricCardData = {
  label: string;
  value: string;
  trend?: string;
  direction?: "up" | "down";
};

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "resumen", label: "Resumen" },
  { key: "cobros", label: "Cobros" },
  { key: "egresos", label: "Egresos" },
  { key: "suscripciones", label: "Suscripciones" },
  { key: "configuracion", label: "Configuración" }
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

export function FinanzasClient() {
  const {
    cobros,
    egresos,
    suscripciones,
    metricas,
    config,
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
  const { clientes } = useClientes();
  const { proyectos } = useProyectos();
  const { cotizaciones } = useCotizaciones();

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

  const monthlySeries = useMemo(() => buildMonthlyFinancialSeries(cobros, egresos, 6), [cobros, egresos]);
  const runwaySeries = useMemo(
    () => buildRunwaySeries(metricas?.caja_actual ?? 0, metricas?.quema_neta ?? 0, 12),
    [metricas?.caja_actual, metricas?.quema_neta]
  );

  const lastSeries = monthlySeries[monthlySeries.length - 1] ?? null;
  const previousSeries = monthlySeries[monthlySeries.length - 2] ?? null;
  const plTrendDirection = getTrendDirection(lastSeries?.neto ?? 0, previousSeries?.neto);

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

  async function handleCreateEgreso(input: Parameters<typeof createEgreso>[0]) {
    try {
      await createEgreso(input);
      showToast("Egreso creado correctamente.", "success");
      void refreshAll();
    } catch (mutationError) {
      showToast(mutationError instanceof Error ? mutationError.message : "No se pudo crear el egreso.", "error");
    }
  }

  async function exportPLToExcel() {
    const workbook = XLSX.utils.book_new();
    const sheetData = monthlySeries.map((point) => ({
      Mes: point.label,
      Ingresos: point.ingresos,
      Egresos: point.egresos,
      Neto: point.neto
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
      trend: undefined,
      direction: undefined
    },
    {
      label: "Runway",
      value:
          metricas?.runway_meses == null
          ? "N/A"
          : `${metricas.runway_meses.toFixed(1)} ${metricas.runway_meses === 1 ? "mes" : "meses"}`,
      trend: metricas?.quema_neta ? formatUSD(metricas.quema_neta) : undefined,
      direction: metricas && metricas.quema_neta > 0 ? "down" : undefined
    },
    {
      label: "Cobros pendientes",
      value: formatUSD(metricas?.cobros_pendientes ?? 0),
      trend: undefined,
      direction: undefined
    },
    {
      label: "Cobros vencidos",
      value: formatUSD(metricas?.cobros_vencidos ?? 0),
      trend: undefined,
      direction: undefined
    },
    {
      label: "P&L del mes",
      value: formatUSD(metricas?.pl_mes ?? 0),
      trend: undefined,
      direction: plTrendDirection
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-title text-carbon">Finanzas</h1>
          <p className="mt-1 text-sm text-graphite">Control económico total del sistema.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => void exportPLToExcel()}>
            Exportar P&L a Excel
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void refreshAll()}>
            Refrescar
          </Button>
        </div>
      </div>

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

      {loading ? (
        <Card padding="lg" className="flex items-center gap-3">
          <Spinner />
          <p className="text-sm text-graphite">Cargando finanzas...</p>
        </Card>
      ) : null}

      {error ? (
        <Card padding="md" className="border border-danger/20 bg-danger-light">
          <p className="text-sm text-danger">{error}</p>
        </Card>
      ) : null}

      {activeTab === "resumen" ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {metricCards.map((card) => (
              <MetricaCard
                key={card.label}
                label={card.label}
                value={card.value}
                trend={card.trend}
                direction={card.direction}
              />
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <PLChart data={monthlySeries} />
            <RunwayChart data={runwaySeries} />
          </div>
        </div>
      ) : null}

      {activeTab === "cobros" ? (
        <CobrosTabla
          cobros={cobros}
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
      ) : null}

      {activeTab === "egresos" ? (
        <EgresosTabla
          egresos={egresos}
          onCreate={handleCreateEgreso}
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
      ) : null}

      {activeTab === "suscripciones" ? (
        <SuscripcionesLista
          suscripciones={suscripciones}
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

      {activeTab === "configuracion" ? (
        <Card padding="lg" className="space-y-4">
          <div>
            <h3 className="text-base font-title text-carbon">Configuración</h3>
            <p className="text-sm text-graphite">Caja inicial usada como punto de partida para runway.</p>
          </div>
          <div className="max-w-sm space-y-3">
            <Input
              label="Caja inicial"
              type="number"
              value={cajaInicialDraft}
              onChange={(event) => setCajaInicialDraft(event.target.value)}
            />
            <Button
              variant="primary"
              onClick={async () => {
                try {
                  await updateConfig({ caja_inicial: Number(cajaInicialDraft || 0) });
                  showToast("Configuración financiera actualizada.", "success");
                  void refreshAll();
                } catch (mutationError) {
                  showToast(mutationError instanceof Error ? mutationError.message : "No se pudo actualizar la configuración.", "error");
                }
              }}
            >
              Guardar caja inicial
            </Button>
          </div>
        </Card>
      ) : null}

      <CobroModal
        isOpen={cobroModalOpen}
        onClose={() => {
          setCobroModalOpen(false);
          setSelectedCobro(null);
        }}
        cobro={selectedCobro}
        clientes={clientes}
        proyectos={proyectos}
        cotizaciones={cotizaciones}
        suscripciones={suscripciones}
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
        proyectos={proyectos}
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
