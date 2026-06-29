"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, EntitySelect, Input } from "@/components/ui";
import { DatosPropuestaForm } from "@/components/cotizador/DatosPropuestaForm";
import {
  calculateHitoMonto,
  createDefaultHito,
  formatCurrency,
  isParametrosStepComplete,
  normalizeHitos
} from "@/lib/cotizaciones";
import type { Cliente } from "@/types/clientes";
import type { Cotizacion, Hito, UpdateCotizacionInput } from "@/types/cotizaciones";
import type { Lead } from "@/types/leads";

type ParametrosFormProps = {
  cotizacion: Cotizacion;
  onChange: (input: UpdateCotizacionInput) => void;
  onNext: () => void;
};

type SourceMode = "lead" | "cliente" | "manual";

function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sumPct(hitos: Hito[]) {
  return hitos.reduce((sum, hito) => sum + hito.pct, 0);
}

export function ParametrosForm({ cotizacion, onChange, onNext }: ParametrosFormProps) {
  const [sourceMode, setSourceMode] = useState<SourceMode>(
    cotizacion.lead_id ? "lead" : cotizacion.cliente_id ? "cliente" : "manual"
  );
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  const hitos = useMemo(
    () => normalizeHitos(cotizacion.precio_total, cotizacion.hitos),
    [cotizacion.hitos, cotizacion.precio_total]
  );
  const totalPct = sumPct(hitos);
  const isComplete = isParametrosStepComplete({
    ...cotizacion,
    hitos
  });

  useEffect(() => {
    if (!cotizacion.hitos || cotizacion.hitos.length === 0) {
      onChange({ hitos: [createDefaultHito()] });
    }
  }, [cotizacion.hitos, onChange]);

  useEffect(() => {
    async function loadOptions() {
      const [leadsResponse, clientesResponse] = await Promise.all([
        fetch("/api/leads?canal=outbound"),
        fetch("/api/clientes?estado=activo")
      ]);

      const leadsPayload = (await leadsResponse.json()) as { data?: Lead[] };
      const clientesPayload = (await clientesResponse.json()) as { data?: Cliente[] };

      setLeads(
        (leadsPayload.data ?? []).filter(
          (lead) => lead.etapa === "calificado" || lead.etapa === "cotizacion"
        )
      );
      setClientes(clientesPayload.data ?? []);
    }

    void loadOptions();
  }, []);

  function updateHitos(nextHitos: Hito[]) {
    onChange({
      hitos: normalizeHitos(cotizacion.precio_total, nextHitos)
    });
  }

  return (
    <Card padding="lg" className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <div className="space-y-5">
          <div className="space-y-3">
            <p className="text-sm font-title text-carbon">Empresa o lead vinculado</p>
            <div className="inline-flex rounded-pill bg-paper p-1">
              {[
                { key: "lead", label: "Lead existente" },
                { key: "cliente", label: "Cliente existente" },
                { key: "manual", label: "Empresa manual" }
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setSourceMode(option.key as SourceMode)}
                  className={[
                    "rounded-pill px-3 py-1.5 text-sm font-label transition-colors duration-fast ease-fast",
                    sourceMode === option.key
                      ? "bg-white text-carbon shadow-soft"
                      : "text-graphite hover:text-carbon"
                  ].join(" ")}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {sourceMode === "lead" ? (
              <EntitySelect
                label="Lead existente"
                value={cotizacion.lead_id}
                placeholder="Seleccionar lead"
                options={leads.map((lead) => ({
                  id: lead.id,
                  label: lead.empresa,
                  sublabel: [lead.rubro, lead.ubicacion, lead.etapa].filter(Boolean).join(" · ")
                }))}
                onChange={(id) => {
                  const selectedLead = leads.find((lead) => lead.id === id);

                  onChange({
                    lead_id: selectedLead?.id ?? null,
                    cliente_id: null,
                    empresa: selectedLead?.empresa ?? cotizacion.empresa
                  });
                }}
              />
            ) : null}

            {sourceMode === "cliente" ? (
              <EntitySelect
                label="Cliente existente"
                value={cotizacion.cliente_id}
                placeholder="Seleccionar cliente"
                options={clientes.map((cliente) => ({
                  id: cliente.id,
                  label: cliente.empresa,
                  sublabel: cliente.pais ?? "Sin país"
                }))}
                onChange={(id) => {
                  const selectedCliente = clientes.find((cliente) => cliente.id === id);

                  onChange({
                    cliente_id: selectedCliente?.id ?? null,
                    lead_id: null,
                    empresa: selectedCliente?.empresa ?? cotizacion.empresa
                  });
                }}
              />
            ) : null}

            {sourceMode === "manual" ? (
              <Input
                label="Empresa"
                value={cotizacion.empresa}
                onChange={(event) =>
                  onChange({
                    empresa: event.target.value,
                    lead_id: null,
                    cliente_id: null
                  })
                }
              />
            ) : null}
          </div>

          <Input
            label="Precio total (USD)"
            type="number"
            value={cotizacion.precio_total?.toString() ?? ""}
            onChange={(event) => {
              const nextPrecio = parseNumber(event.target.value);
              onChange({
                precio_total: nextPrecio,
                hitos: normalizeHitos(nextPrecio, hitos)
              });
            }}
          />

          <Input
            label="Mantenimiento mensual (USD)"
            type="number"
            value={cotizacion.mantenimiento_mensual?.toString() ?? ""}
            onChange={(event) =>
              onChange({
                mantenimiento_mensual: parseNumber(event.target.value)
              })
            }
          />

          <Input
            label="Plazo de desarrollo (semanas)"
            type="number"
            value={cotizacion.plazo_semanas?.toString() ?? ""}
            onChange={(event) =>
              onChange({
                plazo_semanas: parseNumber(event.target.value)
              })
            }
          />
        </div>

        <div className="space-y-4 rounded-card border border-line-soft bg-paper p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-title text-carbon">Hitos de pago</p>
            <span
              className={[
                "rounded-pill px-2.5 py-0.5 text-xs font-label",
                totalPct === 100
                  ? "bg-success-light text-success"
                  : totalPct > 100
                    ? "bg-danger-light text-danger"
                    : "bg-warning-light text-warning"
              ].join(" ")}
            >
              {totalPct}%
            </span>
          </div>

          <div className="space-y-3">
            {hitos.map((hito, index) => (
              <div
                key={hito.id}
                className="grid gap-2 rounded-card bg-white p-3 shadow-soft md:grid-cols-[minmax(0,1fr)_110px_140px_auto]"
              >
                <Input
                  placeholder={index === 0 ? "Anticipo" : "Nombre del hito"}
                  value={hito.nombre}
                  onChange={(event) => {
                    const next = [...hitos];
                    next[index] = {
                      ...hito,
                      nombre: event.target.value
                    };
                    updateHitos(next);
                  }}
                />
                <Input
                  type="number"
                  value={hito.pct.toString()}
                  onChange={(event) => {
                    const pct = parseNumber(event.target.value) ?? 0;
                    const next = [...hitos];
                    next[index] = {
                      ...hito,
                      pct,
                      monto: calculateHitoMonto(cotizacion.precio_total, pct)
                    };
                    updateHitos(next);
                  }}
                />
                <div className="flex items-center rounded-component border border-line bg-paper px-3 text-sm text-carbon">
                  {formatCurrency(hito.monto)}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (hitos.length === 1) {
                      return;
                    }

                    updateHitos(hitos.filter((item) => item.id !== hito.id));
                  }}
                >
                  ×
                </Button>
              </div>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (hitos.length >= 6) {
                return;
              }

              updateHitos([
                ...hitos,
                {
                  id: crypto.randomUUID(),
                  nombre: "",
                  pct: 0,
                  monto: 0
                }
              ]);
            }}
          >
            + Agregar hito
          </Button>

          <div className="text-sm">
            {totalPct < 100 ? (
              <p className="text-warning">Faltan {100 - totalPct}%</p>
            ) : null}
            {totalPct === 100 ? <p className="text-success">Suma correcta ✓</p> : null}
            {totalPct > 100 ? (
              <p className="text-danger">Excede {totalPct - 100}%</p>
            ) : null}
          </div>
        </div>
        </div>

        <DatosPropuestaForm cotizacion={cotizacion} onChange={onChange} />

        <div className="flex justify-end border-t border-line-soft pt-4">
          <Button onClick={onNext} disabled={!isComplete}>
            Siguiente →
        </Button>
      </div>
    </Card>
  );
}
