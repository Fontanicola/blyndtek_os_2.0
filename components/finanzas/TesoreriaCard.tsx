"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Input, Modal } from "@/components/ui";
import { cn } from "@/lib/cn";
import { CAJA_COLOR_OPTIONS, getCajaLightBg } from "@/lib/cajas";
import { chartTheme } from "@/lib/charts/chartTheme";
import { formatFecha, formatUSD } from "@/lib/utils/formatters";
import type { Caja } from "@/types/cajas";
import type { TesoreriaCajaBalance, TesoreriaFinanzas } from "@/types/finanzas";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { CajaDetalleModal } from "./CajaDetalleModal";

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
      className={cn("space-y-4 transition-opacity duration-fast ease-fast", isInactive && "opacity-70")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={cn("h-3 w-3 rounded-full", colorTone)} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-base font-label text-carbon">{item.nombre}</h4>
              {isInactive ? <Badge variant="ghost">Inactiva</Badge> : null}
              {item.es_sin_asignar ? <Badge variant="default">Sin asignar</Badge> : null}
            </div>
            <p className="text-xs text-graphite">{formatMovement(item)}</p>
          </div>
        </div>
        <Badge variant={balanceVariant(item.balance)}>{formatUSD(item.balance)}</Badge>
      </div>

      <div className="grid gap-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-graphite">Cobrado</span>
          <span className="font-label text-success">{formatUSD(item.total_cobrado)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-graphite">Egresado</span>
          <span className="font-label text-danger">{formatUSD(item.total_egresado)}</span>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-line-soft pt-3">
          <span className="text-graphite">Balance</span>
          <span className={cn("font-title text-lg", item.balance >= 0 ? "text-signal" : "text-danger")}>
            {formatUSD(item.balance)}
          </span>
        </div>

        <div className="pt-1">
          <div className="h-[56px] overflow-hidden rounded-component border border-line-soft bg-paper px-2 py-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={item.historico} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
                <Area
                  dataKey="cobrado"
                  stroke={chartTheme.colors.success}
                  strokeWidth={2.2}
                  fill={chartTheme.colors.success}
                  fillOpacity={0.08}
                  dot={false}
                  type="monotone"
                />
                <Area
                  dataKey="egresado"
                  stroke={chartTheme.colors.danger}
                  strokeWidth={2.2}
                  fill={chartTheme.colors.danger}
                  fillOpacity={0.06}
                  dot={false}
                  type="monotone"
                />
              </AreaChart>
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
              placeholder="Caja ahorro USD"
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
  showToast
}: TesoreriaCardProps) {
  const [manageOpen, setManageOpen] = useState(false);
  const [selectedCaja, setSelectedCaja] = useState<TesoreriaCajaBalance | null>(null);
  const cajasVisibles = useMemo(
    () => (data?.cajas ?? []).filter((item) => !(item.es_sin_asignar && item.total_cobrado === 0 && item.total_egresado === 0)),
    [data?.cajas]
  );

  return (
    <div className="space-y-4">
      <Card padding="md" className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-title text-carbon">Tesorería</h3>
            <p className="text-sm text-graphite">Dónde está la plata que ya entró y cómo se compone por caja.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={data ? balanceVariant(data.balance_total) : "default"}>{formatUSD(data?.balance_total ?? 0)}</Badge>
            <Button variant="secondary" size="sm" onClick={() => setManageOpen(true)}>
              Gestionar cajas
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card padding="md" className="space-y-3 bg-paper">
            <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">Balance total</p>
            <p className={cn("text-3xl font-title", (data?.balance_total ?? 0) >= 0 ? "text-signal" : "text-danger")}>
              {formatUSD(data?.balance_total ?? 0)}
            </p>
            <p className="text-sm text-graphite">Incluye caja inicial más balances por caja y sin asignar.</p>
          </Card>

          <Card padding="md" className="space-y-3">
            <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">Caja inicial</p>
            <div className="flex flex-wrap items-end gap-3">
              <Input
                label="Caja inicial"
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
    </div>
  );
}
