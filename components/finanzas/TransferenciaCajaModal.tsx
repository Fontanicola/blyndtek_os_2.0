"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Input, Modal, SavingIndicator } from "@/components/ui";
import { ArrowRightIcon, RefreshIcon } from "@/components/ui/icons";
import { fechaInputAString, hoyLocalString } from "@/lib/utils/fechas";
import type { Caja } from "@/types/cajas";
import type { CreateTransferenciaCajaInput, TransferenciaCajaResponse } from "@/types/transferencias";

type TransferenciaCajaModalProps = {
  isOpen: boolean;
  onClose: () => void;
  cajas: Caja[];
  defaultCajaOrigenId?: string | null;
  onSuccess?: () => Promise<void> | void;
};

type ApiErrorResponse = {
  error?: string;
};

type SaveState = "idle" | "saving" | "saved";

function buildInitialState(defaultCajaOrigenId?: string | null) {
  return {
    caja_origen_id: defaultCajaOrigenId ?? "",
    caja_destino_id: "",
    monto: "",
    fecha: hoyLocalString(),
    nota: ""
  };
}

export function TransferenciaCajaModal({
  isOpen,
  onClose,
  cajas,
  defaultCajaOrigenId = null,
  onSuccess
}: TransferenciaCajaModalProps) {
  const cajasActivas = useMemo(
    () => cajas.filter((caja) => caja.activa && caja.slug !== "sin_asignar"),
    [cajas]
  );
  const [form, setForm] = useState(buildInitialState(defaultCajaOrigenId));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setForm(buildInitialState(defaultCajaOrigenId));
    setSaveState("idle");
    setError(null);
  }, [defaultCajaOrigenId, isOpen]);

  const cajaOrigenOptions = cajasActivas;
  const cajaDestinoOptions = cajasActivas.filter((caja) => caja.id !== form.caja_origen_id);

  function updateField<Key extends keyof typeof form>(key: Key, value: (typeof form)[Key]) {
    setForm((current) => {
      const next = { ...current, [key]: value };

      if (key === "caja_origen_id" && current.caja_destino_id === value) {
        next.caja_destino_id = "";
      }

      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveState("saving");
    setError(null);

    try {
      const payload: CreateTransferenciaCajaInput = {
        caja_origen_id: form.caja_origen_id,
        caja_destino_id: form.caja_destino_id,
        monto: Number(form.monto),
        fecha: fechaInputAString(form.fecha),
        nota: form.nota.trim() || null
      };

      const response = await fetch("/api/transferencias-caja", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const rawResult = await response.json();

      if (!response.ok) {
        const result = rawResult as ApiErrorResponse;
        throw new Error(result.error ?? "No se pudo registrar la transferencia.");
      }

      void (rawResult as TransferenciaCajaResponse);

      setSaveState("saved");
      await onSuccess?.();
      onClose();
    } catch (submitError) {
      setSaveState("idle");
      setError(submitError instanceof Error ? submitError.message : "No se pudo registrar la transferencia.");
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transferir entre cajas" size="md">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end">
          <div className="space-y-1">
            <label className="block text-sm font-label text-carbon">Caja origen</label>
            <select
              value={form.caja_origen_id}
              onChange={(event) => updateField("caja_origen_id", event.target.value)}
              className="w-full rounded-component border border-line bg-white px-3 py-2 text-base text-carbon transition-all duration-fast ease-fast focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
              required
            >
              <option value="">Seleccionar caja</option>
              {cajaOrigenOptions.map((caja) => (
                <option key={caja.id} value={caja.id}>
                  {caja.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden h-10 items-center justify-center text-graphite md:flex">
            <ArrowRightIcon size={18} />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-label text-carbon">Caja destino</label>
            <select
              value={form.caja_destino_id}
              onChange={(event) => updateField("caja_destino_id", event.target.value)}
              className="w-full rounded-component border border-line bg-white px-3 py-2 text-base text-carbon transition-all duration-fast ease-fast focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
              required
            >
              <option value="">Seleccionar caja</option>
              {cajaDestinoOptions.map((caja) => (
                <option key={caja.id} value={caja.id}>
                  {caja.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Monto"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={form.monto}
            onChange={(event) => updateField("monto", event.target.value)}
            placeholder="1500"
            required
          />
          <Input
            label="Fecha"
            type="date"
            value={form.fecha}
            onChange={(event) => updateField("fecha", event.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-label text-carbon">Nota opcional</label>
          <textarea
            value={form.nota}
            onChange={(event) => updateField("nota", event.target.value)}
            rows={3}
            placeholder="Aclaración interna de la transferencia"
            className="w-full resize-y rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon transition-all duration-fast ease-fast placeholder:text-graphite focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
          />
        </div>

        {error ? <div className="rounded-component border border-danger/20 bg-danger-light px-3 py-2 text-sm text-danger">{error}</div> : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-4">
          <SavingIndicator estado={saveState} />
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} disabled={saveState === "saving"}>
              Cancelar
            </Button>
            <Button type="submit" loading={saveState === "saving"}>
              <RefreshIcon size={16} />
              Transferir
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
