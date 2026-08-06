"use client";

import { useEffect, useState } from "react";
import { Card, SavingIndicator } from "@/components/ui";
import {
  navegacionSecciones,
  type NavegacionSeccionKey,
  type PreferenciaNavegacion,
  type PreferenciaNavegacionResponse
} from "@/types/navegacion";

type SaveState = "idle" | "saving" | "saved";

export function NavegacionPreferencias() {
  const [preference, setPreference] = useState<PreferenciaNavegacion | null>(null);
  const [availableSections, setAvailableSections] = useState<NavegacionSeccionKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadPreference() {
      try {
        const response = await fetch("/api/preferencias-navegacion", { cache: "no-store" });
        const payload = await response.json() as PreferenciaNavegacionResponse | { error?: string };
        if (!response.ok || !("data" in payload)) {
          throw new Error("error" in payload ? payload.error : "No se pudo cargar la navegación.");
        }
        if (active) {
          setPreference(payload.data);
          setAvailableSections(payload.secciones_disponibles);
          setError(null);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la navegación.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadPreference();
    return () => {
      active = false;
    };
  }, []);

  async function savePreference(patch: Partial<Pick<PreferenciaNavegacion, "secciones_ocultas" | "modo_foco_activo">>) {
    if (!preference) return;
    const nextPreference = { ...preference, ...patch };
    setPreference(nextPreference);
    setSaveState("saving");
    setError(null);

    try {
      const response = await fetch("/api/preferencias-navegacion", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      const payload = await response.json() as PreferenciaNavegacionResponse | { error?: string };
      if (!response.ok || !("data" in payload)) {
        throw new Error("error" in payload ? payload.error : "No se pudo guardar la navegación.");
      }
      setPreference(payload.data);
      setAvailableSections(payload.secciones_disponibles);
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1800);
    } catch (saveError) {
      setPreference(preference);
      setSaveState("idle");
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar la navegación.");
    }
  }

  function toggleSection(section: NavegacionSeccionKey) {
    if (!preference) return;
    const hidden = new Set(preference.secciones_ocultas);
    if (hidden.has(section)) hidden.delete(section);
    else hidden.add(section);
    void savePreference({ secciones_ocultas: [...hidden] });
  }

  return (
    <Card padding="lg">
      <div className="flex flex-col gap-3 border-b border-line-soft pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-title text-carbon">Navegación</h2>
          <p className="mt-1 max-w-2xl text-sm text-graphite">
            Elegí qué secciones querés ocultar de tu menú habitual. Esto no modifica tus permisos ni bloquea el acceso directo a una ruta.
          </p>
        </div>
        <SavingIndicator estado={saveState} />
      </div>

      {loading ? (
        <div className="mt-5 h-20 animate-pulse rounded-md bg-paper" aria-label="Cargando preferencias" />
      ) : error && !preference ? (
        <p className="mt-5 text-sm text-danger">{error}</p>
      ) : preference ? (
        <div className="mt-5 space-y-5">
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-md border border-line-soft bg-paper/40 px-4 py-3 transition-colors duration-fast ease-fast hover:bg-paper">
            <span>
              <span className="block text-sm font-label text-carbon">Modo foco</span>
              <span className="mt-1 block text-xs text-graphite">Oculta del sidebar las secciones seleccionadas.</span>
            </span>
            <input
              type="checkbox"
              checked={preference.modo_foco_activo}
              onChange={(event) => void savePreference({ modo_foco_activo: event.target.checked })}
              className="h-4 w-4 accent-signal"
            />
          </label>

          <div>
            <p className="text-sm font-label text-carbon">Secciones para ocultar</p>
            <div className="mt-2 divide-y divide-line-soft rounded-md border border-line-soft">
              {availableSections.map((section) => (
                <label key={section} className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3 transition-colors duration-fast ease-fast hover:bg-paper">
                  <span className="text-sm text-graphite">{navegacionSecciones[section]}</span>
                  <input
                    type="checkbox"
                    checked={preference.secciones_ocultas.includes(section)}
                    onChange={() => toggleSection(section)}
                    className="h-4 w-4 accent-signal"
                  />
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-graphite">Dashboard siempre permanece visible para que puedas recuperar cualquier sección.</p>
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </div>
      ) : null}
    </Card>
  );
}
