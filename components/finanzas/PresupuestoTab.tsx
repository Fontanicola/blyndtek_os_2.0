"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState, Input, Spinner } from "@/components/ui";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  DollarSignIcon,
  LandmarkIcon,
  PlusIcon,
  RefreshIcon,
  ServerIcon,
  WalletIcon
} from "@/components/ui/icons";
import { addMonths, formatMonthKey, startOfMonth } from "@/lib/finanzas";
import { presupuestoMesALabel } from "@/lib/finanzas/presupuestos";
import { cn } from "@/lib/cn";
import { formatUSD } from "@/lib/utils/formatters";
import type { PresupuestoItem, PresupuestoMensual, PresupuestoOrigen, PresupuestoPatchInput, PresupuestoTipo } from "@/types/presupuestos";
import { MetricaCard } from "./MetricaCard";
import { PresupuestoChart } from "./PresupuestoChart";

type ManualDraftState = {
  visible: boolean;
  concepto: string;
  monto: string;
};

type PresupuestoItemRowProps = {
  item: PresupuestoItem;
  saving: boolean;
  onToggle: (item: PresupuestoItem, incluido: boolean) => Promise<void>;
  onUpdateMonto: (item: PresupuestoItem, monto: number) => Promise<void>;
};

const origenLabels: Record<PresupuestoOrigen, string> = {
  cobro_existente: "Contrato",
  suscripcion: "Suscripción",
  egreso_recurrente: "Recurrente",
  manual: "Manual"
};

const origenVariants: Record<PresupuestoOrigen, "signal" | "success" | "warning" | "default"> = {
  cobro_existente: "signal",
  suscripcion: "success",
  egreso_recurrente: "warning",
  manual: "default"
};

function buildInitialManualDraft(): ManualDraftState {
  return {
    visible: false,
    concepto: "",
    monto: ""
  };
}

function PresupuestoItemRow({ item, saving, onToggle, onUpdateMonto }: PresupuestoItemRowProps) {
  const [draftMonto, setDraftMonto] = useState(String(item.monto));

  useEffect(() => {
    setDraftMonto(String(item.monto));
  }, [item.monto]);

  async function handleBlur() {
    const parsedMonto = Number(draftMonto);

    if (!Number.isFinite(parsedMonto) || parsedMonto < 0 || parsedMonto === item.monto) {
      setDraftMonto(String(item.monto));
      return;
    }

    await onUpdateMonto(item, parsedMonto);
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-component border border-line-soft bg-white px-4 py-3 transition-colors duration-fast ease-fast md:flex-row md:items-center md:justify-between",
        !item.incluido && "bg-paper/60 opacity-70"
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-line text-signal focus:ring-signal/20"
          checked={item.incluido}
          onChange={(event) => void onToggle(item, event.target.checked)}
          disabled={saving}
        />
        <div className="min-w-0">
          <p className="font-label text-carbon">{item.concepto}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant={origenVariants[item.origen]}>{origenLabels[item.origen]}</Badge>
            {!item.incluido ? <span className="text-xs text-graphite">Excluido del cálculo</span> : null}
          </div>
        </div>
      </div>

      <div className="md:w-[168px]">
        <Input
          value={draftMonto}
          type="number"
          min="0"
          step="0.01"
          onChange={(event) => setDraftMonto(event.target.value)}
          onBlur={() => void handleBlur()}
          disabled={saving}
        />
      </div>
    </div>
  );
}

async function readPresupuesto(month: string) {
  const response = await fetch(`/api/presupuestos/${month}`);
  const payload = (await response.json()) as { data?: PresupuestoMensual; error?: string };

  if (!response.ok || !payload.data) {
    throw new Error(payload.error ?? "No se pudo cargar el presupuesto.");
  }

  return payload.data;
}

async function patchPresupuesto(month: string, body: PresupuestoPatchInput) {
  const response = await fetch(`/api/presupuestos/${month}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const payload = (await response.json()) as { data?: PresupuestoMensual; error?: string };

  if (!response.ok || !payload.data) {
    throw new Error(payload.error ?? "No se pudo actualizar el presupuesto.");
  }

  return payload.data;
}

function getNextBudgetMonth() {
  return formatMonthKey(addMonths(startOfMonth(new Date()), 1));
}

function applyOptimisticItemChange(
  presupuesto: PresupuestoMensual,
  itemId: string,
  updates: Partial<Pick<PresupuestoItem, "incluido" | "monto">>
) {
  const items = presupuesto.items.map((item) => (item.id === itemId ? { ...item, ...updates } : item));
  const ingresos = items.filter((item) => item.tipo === "ingreso" && item.incluido).reduce((total, item) => total + item.monto, 0);
  const egresos = items.filter((item) => item.tipo === "egreso" && item.incluido).reduce((total, item) => total + item.monto, 0);

  return {
    ...presupuesto,
    items,
    ingresos_incluidos_usd: ingresos,
    egresos_incluidos_usd: egresos,
    caja_final_proyectada_usd: presupuesto.caja_inicial_usd + ingresos - egresos
  };
}

export function PresupuestoTab() {
  const [month, setMonth] = useState(getNextBudgetMonth);
  const [presupuesto, setPresupuesto] = useState<PresupuestoMensual | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualDrafts, setManualDrafts] = useState<Record<PresupuestoTipo, ManualDraftState>>({
    ingreso: buildInitialManualDraft(),
    egreso: buildInitialManualDraft()
  });

  const monthLabel = useMemo(() => presupuestoMesALabel(month), [month]);
  const ingresos = useMemo(
    () => presupuesto?.items.filter((item) => item.tipo === "ingreso") ?? [],
    [presupuesto?.items]
  );
  const egresos = useMemo(
    () => presupuesto?.items.filter((item) => item.tipo === "egreso") ?? [],
    [presupuesto?.items]
  );

  const loadPresupuesto = useCallback(async (targetMonth: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await readPresupuesto(targetMonth);
      setPresupuesto(data);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "No se pudo cargar el presupuesto.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPresupuesto(month);
  }, [loadPresupuesto, month]);

  async function mutateBudget(
    updater: () => Promise<PresupuestoMensual>,
    optimistic?: (current: PresupuestoMensual) => PresupuestoMensual
  ) {
    if (!presupuesto) {
      return;
    }

    const previous = presupuesto;
    if (optimistic) {
      setPresupuesto((current) => (current ? optimistic(current) : current));
    }

    setSaving(true);

    try {
      const next = await updater();
      setPresupuesto(next);
    } catch (mutationError) {
      setPresupuesto(previous);
      setError(mutationError instanceof Error ? mutationError.message : "No se pudo actualizar el presupuesto.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(item: PresupuestoItem, incluido: boolean) {
    await mutateBudget(
      () => patchPresupuesto(month, { item_id: item.id, incluido }),
      (current) => applyOptimisticItemChange(current, item.id, { incluido })
    );
  }

  async function handleUpdateMonto(item: PresupuestoItem, monto: number) {
    await mutateBudget(
      () => patchPresupuesto(month, { item_id: item.id, monto }),
      (current) => applyOptimisticItemChange(current, item.id, { monto })
    );
  }

  async function handleAddManual(tipo: PresupuestoTipo) {
    const draft = manualDrafts[tipo];
    const monto = Number(draft.monto);

    if (!draft.concepto.trim() || !Number.isFinite(monto) || monto < 0) {
      setError("Completá concepto y monto válido para agregar el item manual.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const next = await patchPresupuesto(month, {
        tipo,
        concepto: draft.concepto.trim(),
        monto,
        origen: "manual",
        incluido: true
      });
      setPresupuesto(next);
      setManualDrafts((current) => ({
        ...current,
        [tipo]: buildInitialManualDraft()
      }));
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "No se pudo agregar el item manual.");
    } finally {
      setSaving(false);
    }
  }

  function renderSection(tipo: PresupuestoTipo, items: PresupuestoItem[]) {
    const isIngreso = tipo === "ingreso";
    const draft = manualDrafts[tipo];

    return (
      <Card padding="md" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-title text-carbon">{isIngreso ? "Ingresos planificados" : "Egresos planificados"}</h3>
            <p className="text-sm text-graphite">
              {isIngreso
                ? "Cobros esperados y supuestos manuales que querés incluir este mes."
                : "Costos recurrentes y egresos manuales previstos para el mes."}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setManualDrafts((current) => ({
                ...current,
                [tipo]: { ...current[tipo], visible: !current[tipo].visible }
              }))
            }
          >
            <PlusIcon size={16} />
            {isIngreso ? "Agregar ingreso manual" : "Agregar egreso manual"}
          </Button>
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={isIngreso ? DollarSignIcon : WalletIcon}
            titulo={isIngreso ? "No hay ingresos planificados" : "No hay egresos planificados"}
            descripcion={
              isIngreso
                ? "Cuando haya cuotas, suscripciones o ingresos manuales, van a aparecer en esta columna."
                : "Cuando existan recurrentes activos o cargues egresos manuales, van a aparecer en esta columna."
            }
            className="min-h-[180px]"
          />
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <PresupuestoItemRow
                key={item.id}
                item={item}
                saving={saving}
                onToggle={handleToggle}
                onUpdateMonto={handleUpdateMonto}
              />
            ))}
          </div>
        )}

        {draft.visible ? (
          <div className="rounded-component border border-dashed border-line bg-paper/40 p-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]">
              <Input
                placeholder={isIngreso ? "Ej: Venta puntual cerrada por afuera" : "Ej: Inversión en pauta"}
                value={draft.concepto}
                onChange={(event) =>
                  setManualDrafts((current) => ({
                    ...current,
                    [tipo]: {
                      ...current[tipo],
                      concepto: event.target.value
                    }
                  }))
                }
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Monto"
                value={draft.monto}
                onChange={(event) =>
                  setManualDrafts((current) => ({
                    ...current,
                    [tipo]: {
                      ...current[tipo],
                      monto: event.target.value
                    }
                  }))
                }
              />
              <Button variant="secondary" size="sm" onClick={() => void handleAddManual(tipo)} loading={saving}>
                Guardar
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    );
  }

  if (loading) {
    return (
      <Card padding="lg" className="flex items-center gap-3">
        <Spinner />
        <p className="text-sm text-graphite">Cargando presupuesto...</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card padding="md" className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-label text-graphite">Mes seleccionado</p>
          <h3 className="text-xl font-title text-carbon">{monthLabel}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setMonth(formatMonthKey(addMonths(new Date(`${month}-01T00:00:00`), -1)))}>
            <ArrowLeftIcon size={16} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setMonth(formatMonthKey(addMonths(new Date(`${month}-01T00:00:00`), 1)))}>
            <ArrowRightIcon size={16} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void loadPresupuesto(month)}>
            <RefreshIcon size={16} />
          </Button>
        </div>
      </Card>

      {error ? (
        <Card padding="sm" className="border-danger/20 bg-danger-light">
          <p className="text-sm text-danger">{error}</p>
        </Card>
      ) : null}

      {presupuesto ? (
        <>
          <div className="grid gap-4 xl:grid-cols-4">
            <MetricaCard
              label={`Caja al inicio de ${monthLabel}`}
              value={formatUSD(presupuesto.caja_inicial_usd)}
              icono={<LandmarkIcon />}
              colorIcono="graphite"
            />
            <MetricaCard
              label="Ingresos incluidos"
              value={formatUSD(presupuesto.ingresos_incluidos_usd)}
              icono={<DollarSignIcon />}
              colorIcono="success"
            />
            <MetricaCard
              label="Egresos incluidos"
              value={formatUSD(presupuesto.egresos_incluidos_usd)}
              icono={<ServerIcon />}
              colorIcono="danger"
            />
            <MetricaCard
              label="Caja proyectada al final"
              value={formatUSD(presupuesto.caja_final_proyectada_usd)}
              icono={<CheckCircleIcon />}
              colorIcono={presupuesto.caja_final_proyectada_usd >= presupuesto.caja_inicial_usd ? "success" : "warning"}
              description="Se recalcula con cada item incluido o excluido."
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {renderSection("ingreso", ingresos)}
            {renderSection("egreso", egresos)}
          </div>

          <PresupuestoChart
            label={monthLabel}
            ingresos={presupuesto.ingresos_incluidos_usd}
            egresos={presupuesto.egresos_incluidos_usd}
          />
        </>
      ) : null}
    </div>
  );
}
