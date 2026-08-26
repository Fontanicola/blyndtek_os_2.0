"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Input, Modal } from "@/components/ui";
import { cn } from "@/lib/cn";
import { CAJA_COLOR_OPTIONS, getCajaLightBg } from "@/lib/cajas";
import { chartTheme } from "@/lib/charts/chartTheme";
import { formatARS, formatFecha } from "@/lib/utils/formatters";
import type { CreateCobroInput } from "@/types/cobros";
import type { Caja } from "@/types/cajas";
import type { Cliente } from "@/types/clientes";
import type { CreateEgresoInput } from "@/types/egresos";
import type { TesoreriaCajaBalance, TesoreriaFinanzas } from "@/types/finanzas";
import type { Proyecto } from "@/types/proyectos";
import type { Cotizacion } from "@/types/cotizaciones";
import type { Suscripcion } from "@/types/suscripciones";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { CajaDetalleModal } from "./CajaDetalleModal";
import { TransferenciaCajaModal } from "./TransferenciaCajaModal";

type TesoreriaCardProps = {
  data: TesoreriaFinanzas | null;
  cajas: Caja[];
  cajaInicialDraft: string;
  onCajaInicialDraftChange: (value: string) => void;
  onSaveCajaInicial: () => Promise<void> | void;
  onRefreshData: () => Promise<void> | void;
  onCreateCaja: (input: { nombre: string; color: string }) => Promise<Caja>;
  onUpdateCaja: (id: string, input: Partial<Pick<Caja, "nombre" | "color" | "activa" | "orden">>) => Promise<Caja>;
  onDeleteCaja: (id: string) => Promise<void>;
  onCreateCobro: (input: CreateCobroInput) => Promise<unknown>;
  onCreateEgreso: (input: CreateEgresoInput) => Promise<unknown>;
  clientes: Array<Pick<Cliente, "id" | "empresa" | "pais" | "estado">>;
  proyectos: Array<Pick<Proyecto, "id" | "nombre" | "estado" | "cliente_id"> & { clienteNombre?: string | null }>;
  cotizaciones: Array<Pick<Cotizacion, "id" | "empresa" | "precio_total">>;
  suscripciones: Array<Pick<Suscripcion, "id" | "tipo" | "estado" | "monto_mensual">>;
  showToast: (message: string, type?: "success" | "info" | "warning" | "error") => void;
};

function balanceVariant(balance: number) {
  return balance >= 0 ? "signal" : "danger";
}

function formatMovement(item: TesoreriaCajaBalance) {
  if (item.es_sin_asignar) {
    return "Cobros o egresos sin cuenta asignada";
  }

  return item.ultimo_movimiento ? formatFecha(item.ultimo_movimiento) : "Sin movimientos";
}

function formatSparklineMonth(label: string | number) {
  return String(label).slice(0, 3);
}

function CajaCard({ item, onOpen }: { item: TesoreriaCajaBalance; onOpen?: (item: TesoreriaCajaBalance) => void }) {
  const isInactive = !item.activa && !item.es_sin_asignar;
  const colorTone = getCajaLightBg(item.color);
  const shouldHide = item.es_sin_asignar && item.total_cobrado === 0 && item.total_egresado === 0;

  if (shouldHide) {
    return null;
  }

  return (
    <Card
      padding="md"
      onClick={onOpen ? () => onOpen(item) : undefined}
      className={cn("min-w-0 space-y-4 transition-opacity duration-fast ease-fast", isInactive && "opacity-70")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex items-center gap-3">
          <span className={cn("h-3 w-3 rounded-full", colorTone)} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="truncate text-base font-label text-carbon">{item.nombre}</h4>
              {isInactive ? <Badge variant="ghost">Inactiva</Badge> : null}
              {item.es_sin_asignar ? <Badge variant="default">Sin asignar</Badge> : null}
            </div>
            <p className="truncate text-xs text-graphite">{formatMovement(item)}</p>
          </div>
        </div>
        <Badge variant={balanceVariant(item.balance)} className="max-w-full shrink-0">
          {formatARS(item.balance)}
        </Badge>
      </div>

      <div className="grid min-w-0 gap-3 text-sm">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,auto)] items-center gap-3">
          <span className="truncate text-graphite">Cobrado</span>
          <span className="min-w-0 text-right font-label leading-tight text-success [overflow-wrap:anywhere]">
            {formatARS(item.total_cobrado)}
          </span>
        </div>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,auto)] items-center gap-3">
          <span className="truncate text-graphite">Egresado</span>
          <span className="min-w-0 text-right font-label leading-tight text-danger [overflow-wrap:anywhere]">
            {formatARS(item.total_egresado)}
          </span>
        </div>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,auto)] items-center gap-3 border-t border-line-soft pt-3">
          <span className="truncate text-graphite">Balance</span>
          <span
            className={cn(
              "min-w-0 text-right font-title text-lg leading-tight [overflow-wrap:anywhere]",
              item.balance >= 0 ? "text-signal" : "text-danger"
            )}
          >
            {formatARS(item.balance)}
          </span>
        </div>

        <div className="space-y-2 pt-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-graphite">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-success" />
              Ingresos
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-danger" />
              Egresos
            </span>
          </div>
          <div className="h-[88px] overflow-hidden rounded-component border border-line-soft bg-paper px-2 py-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={item.historico} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid
                  stroke={chartTheme.grid.stroke}
                  strokeDasharray={chartTheme.grid.strokeDasharray}
                  vertical={false}
                />
                <XAxis
                  dataKey="mes"
                  tickFormatter={formatSparklineMonth}
                  tick={chartTheme.sparkline.xTick}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={chartTheme.axis.tickMargin}
                  minTickGap={18}
                  interval="preserveStartEnd"
                />
                <YAxis hide domain={[0, "dataMax"]} />
                <Line
                  dataKey="cobrado"
                  stroke={chartTheme.colors.success}
                  strokeWidth={chartTheme.sparkline.strokeWidth}
                  dot={false}
                  type={chartTheme.sparkline.type}
                />
                <Line
                  dataKey="egresado"
                  stroke={chartTheme.colors.danger}
                  strokeWidth={chartTheme.sparkline.strokeWidth}
                  dot={false}
                  type={chartTheme.sparkline.type}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {item.es_sin_asignar ? (
          <p className="text-xs text-graphite">Asignale una cuenta desde Cobros o Egresos para que deje de aparecer acá.</p>
        ) : null}
      </div>
    </Card>
  );
}

function GestionarCajasModal({
  isOpen,
  onClose,
  cajas,
  onCreateCaja,
  onUpdateCaja,
  onDeleteCaja,
  onRefreshData,
  showToast
}: {
  isOpen: boolean;
  onClose: () => void;
  cajas: Caja[];
  onCreateCaja: (input: { nombre: string; color: string }) => Promise<Caja>;
  onUpdateCaja: (id: string, input: Partial<Pick<Caja, "nombre" | "color" | "activa" | "orden">>) => Promise<Caja>;
  onDeleteCaja: (id: string) => Promise<void>;
  onRefreshData: () => Promise<void> | void;
  showToast: (message: string, type?: "success" | "info" | "warning" | "error") => void;
}) {
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  const [draftColors, setDraftColors] = useState<Record<string, string>>({});
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoColor, setNuevoColor] = useState<(typeof CAJA_COLOR_OPTIONS)[number]>("signal");
  const [savingId, setSavingId] = useState<string | null>(null);

  const cajasEditables = useMemo(
    () => cajas.filter((caja) => caja.slug !== "sin_asignar"),
    [cajas]
  );

  useEffect(() => {
    const nextDraftNames: Record<string, string> = {};
    const nextDraftColors: Record<string, string> = {};

    for (const caja of cajasEditables) {
      nextDraftNames[caja.id] = caja.nombre;
      nextDraftColors[caja.id] = caja.color;
    }

    setDraftNames(nextDraftNames);
    setDraftColors(nextDraftColors);
  }, [cajasEditables, isOpen]);

  async function updateCaja(id: string, patch: Partial<Pick<Caja, "nombre" | "color" | "activa" | "orden">>) {
    setSavingId(id);
    try {
      await onUpdateCaja(id, patch);
      showToast("Caja actualizada.", "success");
      await onRefreshData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo actualizar la caja.", "error");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("¿Eliminar esta caja?");
    if (!confirmed) {
      return;
    }

    setSavingId(id);
    try {
      await onDeleteCaja(id);
      showToast("Caja eliminada.", "success");
      await onRefreshData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo eliminar la caja.", "error");
    } finally {
      setSavingId(null);
    }
  }

  async function handleCreate() {
    const nombre = nuevoNombre.trim();
    if (!nombre) {
      showToast("El nombre de la caja es obligatorio.", "warning");
      return;
    }

    try {
      setSavingId("__new__");
      await onCreateCaja({
        nombre,
        color: nuevoColor
      });
      setNuevoNombre("");
      setNuevoColor("signal");
      showToast("Caja creada correctamente.", "success");
      await onRefreshData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo crear la caja.", "error");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gestionar cajas" size="lg">
      <div className="space-y-4">
        <div className="space-y-3">
          {cajasEditables.map((caja) => (
            <div key={caja.id} className="rounded-card border border-line-soft bg-white p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className={cn("h-3 w-3 rounded-full", getCajaLightBg(caja.color))} />
                <Input
                  label="Nombre"
                  value={draftNames[caja.id] ?? caja.nombre}
                  onChange={(event) =>
                    setDraftNames((current) => ({
                      ...current,
                      [caja.id]: event.target.value
                    }))
                  }
                  onBlur={async (event) => {
                    const nextValue = event.target.value.trim();
                    if (!nextValue || nextValue === caja.nombre) {
                      return;
                    }

                    void updateCaja(caja.id, { nombre: nextValue });
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") {
                      return;
                    }

                    event.preventDefault();
                    event.currentTarget.blur();
                  }}
                  className="min-w-[220px] flex-1"
                />

                <div className="min-w-[170px]">
                  <label className="text-sm font-label text-carbon">Color</label>
                  <select
                    value={draftColors[caja.id] ?? caja.color}
                    onChange={(event) => {
                      const nextColor = event.target.value;
                      setDraftColors((current) => ({
                        ...current,
                        [caja.id]: nextColor
                      }));
                      void updateCaja(caja.id, { color: nextColor });
                    }}
                    className="mt-1 w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
                  >
                    {CAJA_COLOR_OPTIONS.map((color) => (
                      <option key={color} value={color}>
                        {color}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="inline-flex items-center gap-2 text-sm text-carbon">
                  <input
                    type="checkbox"
                    checked={caja.activa}
                    onChange={(event) => {
                      void updateCaja(caja.id, { activa: event.target.checked });
                    }}
                    className="h-4 w-4 rounded border-line text-signal focus:ring-signal/20"
                  />
                  Activa
                </label>

                <Button
                  variant="danger"
                  size="sm"
                  loading={savingId === caja.id}
                  onClick={() => void handleDelete(caja.id)}
                >
                  Eliminar
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Card padding="md" className="space-y-4 bg-paper">
          <h4 className="text-base font-title text-carbon">+ Nueva caja</h4>
          <div className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end">
            <Input
              label="Nombre"
              value={nuevoNombre}
              onChange={(event) => setNuevoNombre(event.target.value)}
              placeholder="Caja ahorro pesos"
            />

            <div className="space-y-1">
              <label className="text-sm font-label text-carbon">Color</label>
              <select
                value={nuevoColor}
                onChange={(event) => setNuevoColor(event.target.value as (typeof CAJA_COLOR_OPTIONS)[number])}
                className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
              >
                {CAJA_COLOR_OPTIONS.map((color) => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </select>
            </div>

            <Button variant="primary" onClick={() => void handleCreate()} loading={savingId === "__new__"}>
              Crear caja
            </Button>
          </div>
        </Card>
      </div>
    </Modal>
  );
}

export function TesoreriaCard({
  data,
  cajas,
  cajaInicialDraft,
  onCajaInicialDraftChange,
  onSaveCajaInicial,
  onRefreshData,
  onCreateCaja,
  onUpdateCaja,
  onDeleteCaja,
  onCreateCobro,
  onCreateEgreso,
  clientes,
  proyectos,
  cotizaciones,
  suscripciones,
  showToast
}: TesoreriaCardProps) {
  const [manageOpen, setManageOpen] = useState(false);
  const [selectedCaja, setSelectedCaja] = useState<TesoreriaCajaBalance | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferDefaultOrigenId, setTransferDefaultOrigenId] = useState<string | null>(null);
  const [movimientosRefreshKey, setMovimientosRefreshKey] = useState(0);
  const cajasVisibles = useMemo(
    () => (data?.cajas ?? []).filter((item) => !(item.es_sin_asignar && item.total_cobrado === 0 && item.total_egresado === 0)),
    [data?.cajas]
  );

  function openTransferModal(cajaOrigenId?: string | null) {
    setTransferDefaultOrigenId(cajaOrigenId ?? null);
    setTransferOpen(true);
  }

  async function handleTransferSuccess() {
    await onRefreshData();
    setMovimientosRefreshKey((current) => current + 1);
    showToast("Transferencia registrada correctamente.", "success");
  }

  return (
    <div className="space-y-4">
      <Card padding="md" className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-title text-carbon">Tesorería</h3>
            <p className="text-sm text-graphite">Dónde está la plata que ya entró y cómo se compone por caja.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={data ? balanceVariant(data.balance_total) : "default"}>{formatARS(data?.balance_total ?? 0)}</Badge>
            <Button variant="primary" size="sm" onClick={() => openTransferModal()}>
              Transferir
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setManageOpen(true)}>
              Gestionar cajas
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card padding="md" className="space-y-3 bg-paper">
            <p className="text-xs font-label text-graphite">Balance total</p>
            <p className={cn("text-3xl font-title", (data?.balance_total ?? 0) >= 0 ? "text-signal" : "text-danger")}>
              {formatARS(data?.balance_total ?? 0)}
            </p>
            <p className="text-sm text-graphite">Incluye caja inicial más balances por caja y sin asignar.</p>
          </Card>

          <Card padding="md" className="space-y-3">
            <p className="text-xs font-label text-graphite">Caja inicial</p>
            <div className="flex flex-wrap items-end gap-3">
              <Input
                label="Caja inicial en pesos"
                type="number"
                value={cajaInicialDraft}
                onChange={(event) => onCajaInicialDraftChange(event.target.value)}
                className="max-w-[180px]"
              />
              <Button variant="primary" size="sm" onClick={() => void onSaveCajaInicial()}>
                Guardar caja inicial
              </Button>
            </div>
          </Card>
        </div>
      </Card>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,36rem),1fr))] gap-4">
        {cajasVisibles.map((item) => (
          <CajaCard key={item.slug} item={item} onOpen={setSelectedCaja} />
        ))}
      </div>

      <GestionarCajasModal
        isOpen={manageOpen}
        onClose={() => setManageOpen(false)}
        cajas={cajas}
        onCreateCaja={onCreateCaja}
        onUpdateCaja={onUpdateCaja}
        onDeleteCaja={onDeleteCaja}
        onRefreshData={onRefreshData}
        showToast={showToast}
      />

      <CajaDetalleModal
        isOpen={Boolean(selectedCaja)}
        onClose={() => setSelectedCaja(null)}
        refreshKey={movimientosRefreshKey}
        onRequestTransfer={(cajaId) => openTransferModal(cajaId)}
        cajas={cajas.filter((item) => item.activa)}
        clientes={clientes}
        proyectos={proyectos}
        cotizaciones={cotizaciones}
        suscripciones={suscripciones}
        onCreateCobro={onCreateCobro}
        onCreateEgreso={onCreateEgreso}
        onRefreshTesoreria={onRefreshData}
        showToast={showToast}
        caja={
          selectedCaja
            ? {
                id: selectedCaja.id ?? "sin_asignar",
                nombre: selectedCaja.nombre,
                color: selectedCaja.color
              }
            : null
        }
      />

      <TransferenciaCajaModal
        isOpen={transferOpen}
        onClose={() => setTransferOpen(false)}
        cajas={cajas}
        defaultCajaOrigenId={transferDefaultOrigenId}
        onSuccess={handleTransferSuccess}
      />
    </div>
  );
}
