"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState, Input, SavingIndicator } from "@/components/ui";
import { SettingsIcon } from "@/components/ui/icons";
import type { Json } from "@/types/supabase";
import type { AgenteConfigRow } from "@/types/agentes";

type ConfiguracionAgenteFormProps = {
  agenteId: string;
};

type SaveState = "idle" | "saving" | "saved";

function humanizeKey(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function valueToInput(value: Json) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  return "";
}

function parseInputValue(original: Json, value: string | boolean): Json {
  if (typeof original === "boolean") {
    return Boolean(value);
  }

  if (typeof original === "number") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return String(value);
}

export function ConfiguracionAgenteForm({ agenteId }: ConfiguracionAgenteFormProps) {
  const [rows, setRows] = useState<AgenteConfigRow[]>([]);
  const [values, setValues] = useState<Record<string, Json>>({});
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const sortedRows = useMemo(() => [...rows].sort((a, b) => a.clave.localeCompare(b.clave)), [rows]);

  useEffect(() => {
    let ignore = false;

    async function loadConfig() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/agentes/${agenteId}/config`);
        const payload = (await response.json()) as { data?: { configRows?: AgenteConfigRow[] }; error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "No se pudo cargar la configuración.");
        }

        if (ignore) {
          return;
        }

        const nextRows = payload.data?.configRows ?? [];
        setRows(nextRows);
        setValues(Object.fromEntries(nextRows.map((row) => [row.clave, row.valor])));
        setDirty(false);
        setSaveState("idle");
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la configuración.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadConfig();

    return () => {
      ignore = true;
    };
  }, [agenteId]);

  useEffect(() => {
    if (!dirty) {
      return;
    }

    const timeout = window.setTimeout(async () => {
      setSaveState("saving");
      setError(null);

      try {
        const response = await fetch(`/api/agentes/${agenteId}/config`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ valores: values })
        });
        const payload = (await response.json()) as { data?: { configRows?: AgenteConfigRow[] }; error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "No se pudo guardar la configuración.");
        }

        const nextRows = payload.data?.configRows ?? rows;
        setRows(nextRows);
        setValues(Object.fromEntries(nextRows.map((row) => [row.clave, row.valor])));
        setDirty(false);
        setSaveState("saved");
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "No se pudo guardar la configuración.");
        setSaveState("idle");
      }
    }, 1500);

    return () => window.clearTimeout(timeout);
  }, [agenteId, dirty, rows, values]);

  function updateValue(row: AgenteConfigRow, value: string | boolean) {
    setValues((current) => ({
      ...current,
      [row.clave]: parseInputValue(row.valor, value)
    }));
    setDirty(true);
    setSaveState("idle");
  }

  if (loading) {
    return <div className="rounded-component border border-line-soft bg-paper p-4 text-sm text-graphite">Cargando configuración...</div>;
  }

  if (sortedRows.length === 0) {
    return (
      <EmptyState
        icon={SettingsIcon}
        titulo="Sin configuración editable"
        descripcion="Este agente todavía no tiene claves cargadas en agente_config."
        className="min-h-[160px]"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="font-title text-lg text-carbon">Configuración</h4>
          <p className="text-sm text-graphite">Campos generados automáticamente desde agente_config.</p>
        </div>
        <SavingIndicator estado={saveState} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sortedRows.map((row) => {
          const currentValue = values[row.clave] ?? row.valor;
          const inputValue = valueToInput(currentValue);

          if (typeof row.valor === "boolean") {
            return (
              <div key={row.id} className="space-y-2">
                <span className="text-sm font-label text-carbon">{humanizeKey(row.clave)}</span>
                <button
                  type="button"
                  onClick={() => updateValue(row, !Boolean(inputValue))}
                  className={[
                    "flex h-12 w-full items-center justify-between rounded-component border px-4 text-sm transition-colors duration-fast ease-fast",
                    inputValue ? "border-success bg-success-light text-success" : "border-line bg-white text-graphite"
                  ].join(" ")}
                >
                  <span>{inputValue ? "Activo" : "Inactivo"}</span>
                  <span className={["flex h-6 w-11 items-center rounded-full px-1", inputValue ? "bg-success" : "bg-line"].join(" ")}>
                    <span
                      className={[
                        "h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-fast ease-fast",
                        inputValue ? "translate-x-5" : "translate-x-0"
                      ].join(" ")}
                    />
                  </span>
                </button>
              </div>
            );
          }

          return (
            <label key={row.id} className="space-y-2">
              <span className="text-sm font-label text-carbon">{humanizeKey(row.clave)}</span>
              <Input
                type={typeof row.valor === "number" ? "number" : "text"}
                value={String(inputValue)}
                onChange={(event) => updateValue(row, event.target.value)}
              />
            </label>
          );
        })}
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}

