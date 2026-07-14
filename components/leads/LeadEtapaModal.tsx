"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Input, Modal } from "@/components/ui";
import { ETAPA_LABELS } from "@/lib/leads";
import type { EtapaLead, Lead, LeadStageTransitionInput, LeadTouchKey } from "@/types/leads";

type LeadEtapaModalProps = {
  lead: Lead | null;
  targetEtapa: EtapaLead | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (input: LeadStageTransitionInput) => void | Promise<void>;
};

type TouchKeyOption = {
  value: LeadTouchKey;
  label: string;
};

const touchOptions: TouchKeyOption[] = [
  { value: "llamada", label: "Llamada" },
  { value: "seg1", label: "Seguimiento 1" },
  { value: "seg2", label: "Seguimiento 2" }
];

function formatUSD(value: number | null) {
  if (value === null) {
    return "—";
  }

  return `USD ${value.toLocaleString("en-US")}`;
}

export function LeadEtapaModal({
  lead,
  targetEtapa,
  isOpen,
  onClose,
  onConfirm
}: LeadEtapaModalProps) {
  const [touchpoint, setTouchpoint] = useState<LeadTouchKey>("seg1");
  const [seguimientoFecha, setSeguimientoFecha] = useState("");
  const [calificacionNota, setCalificacionNota] = useState("");
  const [montoPropuestoDesarrollo, setMontoPropuestoDesarrollo] = useState("");
  const [montoPropuestoMensual, setMontoPropuestoMensual] = useState("");
  const [mismoMonto, setMismoMonto] = useState(true);
  const [montoNegociadoDesarrollo, setMontoNegociadoDesarrollo] = useState("");
  const [montoNegociadoMensual, setMontoNegociadoMensual] = useState("");
  const [motivoNegociacion, setMotivoNegociacion] = useState("");
  const [saving, setSaving] = useState(false);

  const proposedDevelopment = lead?.monto_propuesto_desarrollo ?? null;
  const proposedMonthly = lead?.monto_propuesto_mensual ?? null;

  useEffect(() => {
    if (!isOpen || !targetEtapa) {
      return;
    }

    setTouchpoint("seg1");
    setSeguimientoFecha("");
    setCalificacionNota("");
    setMontoPropuestoDesarrollo(lead?.monto_propuesto_desarrollo?.toString() ?? "");
    setMontoPropuestoMensual(lead?.monto_propuesto_mensual?.toString() ?? "");
    setMismoMonto(true);
    setMontoNegociadoDesarrollo(lead?.monto_negociado_desarrollo?.toString() ?? "");
    setMontoNegociadoMensual(lead?.monto_negociado_mensual?.toString() ?? "");
    setMotivoNegociacion("");
  }, [isOpen, lead, targetEtapa]);

  const isCotizacionValid =
    montoPropuestoDesarrollo.trim().length > 0 && montoPropuestoMensual.trim().length > 0;
  const hasProposal = proposedDevelopment !== null && proposedMonthly !== null;
  const isGanadoValid = mismoMonto ? hasProposal : montoNegociadoDesarrollo.trim().length > 0 && montoNegociadoMensual.trim().length > 0;

  const confirmDisabled = useMemo(() => {
    if (!targetEtapa) {
      return true;
    }

    if (targetEtapa === "cotizacion") {
      return !isCotizacionValid;
    }

    if (targetEtapa === "ganado") {
      return !isGanadoValid;
    }

    return false;
  }, [isCotizacionValid, isGanadoValid, targetEtapa]);

  async function handleConfirm() {
    if (!targetEtapa) {
      return;
    }

    setSaving(true);

    try {
      if (targetEtapa === "seguimiento") {
        await onConfirm({
          touchpoint,
          seguimiento_fecha: seguimientoFecha || null
        });
        return;
      }

      if (targetEtapa === "calificado") {
        await onConfirm({
          calificacion_nota: calificacionNota.trim() || null
        });
        return;
      }

      if (targetEtapa === "cotizacion") {
        await onConfirm({
          monto_propuesto_desarrollo: Number(montoPropuestoDesarrollo),
          monto_propuesto_mensual: Number(montoPropuestoMensual)
        });
        return;
      }

      await onConfirm(
        mismoMonto
          ? {
              mismo_monto: true
            }
          : {
              mismo_monto: false,
              monto_propuesto_desarrollo: proposedDevelopment,
              monto_propuesto_mensual: proposedMonthly,
              monto_negociado_desarrollo: Number(montoNegociadoDesarrollo),
              monto_negociado_mensual: Number(montoNegociadoMensual),
              motivo_negociacion: motivoNegociacion.trim() || null
            }
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={targetEtapa ? ETAPA_LABELS[targetEtapa] : "Mover lead"} size="lg">
      <div className="space-y-5">
        {targetEtapa === "seguimiento" ? (
          <>
            <div className="space-y-2">
              <p className="text-sm font-label text-carbon">Registrar touch point</p>
              <div className="grid gap-2 md:grid-cols-3">
                {touchOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTouchpoint(option.value)}
                    className={
                      option.value === touchpoint
                        ? "rounded-component border border-signal bg-signal-light px-3 py-2 text-sm font-label text-signal"
                        : "rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon transition-colors duration-fast ease-fast hover:bg-paper"
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Programar próximo seguimiento"
              type="date"
              value={seguimientoFecha}
              onChange={(event) => setSeguimientoFecha(event.target.value)}
            />
          </>
        ) : null}

        {targetEtapa === "calificado" ? (
          <div className="space-y-2">
            <label className="block text-sm font-label text-carbon">Comentarios / notas de calificación</label>
            <textarea
              value={calificacionNota}
              onChange={(event) => setCalificacionNota(event.target.value)}
              placeholder="Presupuesto estimado, urgencia, decisor real..."
              className="min-h-[120px] w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon transition-all duration-fast ease-fast placeholder:text-graphite focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
            />
          </div>
        ) : null}

        {targetEtapa === "cotizacion" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Monto propuesto — Desarrollo (USD)"
              type="number"
              value={montoPropuestoDesarrollo}
              onChange={(event) => setMontoPropuestoDesarrollo(event.target.value)}
              required
            />
            <Input
              label="Monto propuesto — Mensual (USD)"
              type="number"
              value={montoPropuestoMensual}
              onChange={(event) => setMontoPropuestoMensual(event.target.value)}
              required
            />
          </div>
        ) : null}

        {targetEtapa === "ganado" ? (
          <div className="space-y-4">
            <div className="rounded-card border border-line-soft bg-paper p-4 text-sm text-carbon">
              <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">Monto propuesto</p>
              <p className="mt-2">
                Desarrollo: <span className="font-label">{formatUSD(proposedDevelopment)}</span>
              </p>
              <p className="mt-1">
                Mensual: <span className="font-label">{formatUSD(proposedMonthly)}</span>
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-label text-carbon">¿Se cerró con el monto propuesto o se negoció un monto distinto?</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setMismoMonto(true)}
                  className={
                    mismoMonto
                      ? "rounded-component border border-signal bg-signal-light px-3 py-2 text-sm font-label text-signal"
                      : "rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon transition-colors duration-fast ease-fast hover:bg-paper"
                  }
                >
                  Mismo monto propuesto
                </button>
                <button
                  type="button"
                  onClick={() => setMismoMonto(false)}
                  className={
                    !mismoMonto
                      ? "rounded-component border border-signal bg-signal-light px-3 py-2 text-sm font-label text-signal"
                      : "rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon transition-colors duration-fast ease-fast hover:bg-paper"
                  }
                >
                  Monto negociado distinto
                </button>
              </div>
            </div>

            {!mismoMonto ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Monto final — Desarrollo (USD)"
                  type="number"
                  value={montoNegociadoDesarrollo}
                  onChange={(event) => setMontoNegociadoDesarrollo(event.target.value)}
                  required
                />
                <Input
                  label="Monto final — Mensual (USD)"
                  type="number"
                  value={montoNegociadoMensual}
                  onChange={(event) => setMontoNegociadoMensual(event.target.value)}
                  required
                />
                <div className="md:col-span-2">
                  <label className="block text-sm font-label text-carbon">Motivo de la negociación</label>
                  <textarea
                    value={motivoNegociacion}
                    onChange={(event) => setMotivoNegociacion(event.target.value)}
                    className="mt-1 min-h-[100px] w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon transition-all duration-fast ease-fast placeholder:text-graphite focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-3 border-t border-line-soft pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void handleConfirm()} loading={saving} disabled={confirmDisabled}>
            Confirmar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
