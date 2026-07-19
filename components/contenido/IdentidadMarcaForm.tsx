"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { updateMarcaBlyndtek } from "@/lib/hooks/useContenido";
import type { MarcaContenido } from "@/types/contenido";

type IdentidadMarcaFormProps = {
  marca: MarcaContenido;
  onSaved?: (marca: MarcaContenido) => void;
};

const FIELDS = [
  { key: "tono_voz", label: "Tono de voz", placeholder: "Cómo habla Blyndtek: directo, premium, técnico, cercano..." },
  { key: "publico_objetivo", label: "Público objetivo", placeholder: "A quién le hablamos y qué problema concreto tiene." },
  { key: "paleta_colores", label: "Paleta de colores", placeholder: "Colores, contrastes y criterios visuales de marca." },
  { key: "que_mostrar", label: "Qué mostrar", placeholder: "Pruebas, procesos, resultados, pantallas, detrás de escena..." },
  { key: "que_evitar", label: "Qué evitar", placeholder: "Temas, tonos o recursos visuales que no representan la marca." }
] as const;

export function IdentidadMarcaForm({ marca, onSaved }: IdentidadMarcaFormProps) {
  const [draft, setDraft] = useState(() => ({
    tono_voz: marca.tono_voz ?? "",
    publico_objetivo: marca.publico_objetivo ?? "",
    paleta_colores: marca.paleta_colores ?? "",
    que_mostrar: marca.que_mostrar ?? "",
    que_evitar: marca.que_evitar ?? ""
  }));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const hydratedRef = useRef(false);

  useEffect(() => {
    setDraft({
      tono_voz: marca.tono_voz ?? "",
      publico_objetivo: marca.publico_objetivo ?? "",
      paleta_colores: marca.paleta_colores ?? "",
      que_mostrar: marca.que_mostrar ?? "",
      que_evitar: marca.que_evitar ?? ""
    });
  }, [marca]);

  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        setStatus("saving");
        const saved = await updateMarcaBlyndtek(draft);
        setStatus("saved");
        onSaved?.(saved);
      } catch {
        setStatus("error");
      }
    }, 1500);

    return () => window.clearTimeout(timeoutId);
  }, [draft, onSaved]);

  return (
    <Card className="space-y-5" padding="lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-title text-2xl text-carbon">Identidad de Blyndtek</h2>
          <p className="mt-1 text-sm text-graphite">Base manual para mantener consistencia en cada pieza.</p>
        </div>
        <span
          className={cn(
            "rounded-pill px-3 py-1 text-xs font-label",
            status === "saving" && "bg-warning-light text-warning",
            status === "saved" && "bg-success-light text-success",
            status === "error" && "bg-danger-light text-danger",
            status === "idle" && "bg-paper text-graphite"
          )}
        >
          {status === "saving" ? "Guardando" : status === "saved" ? "Guardado" : status === "error" ? "Error" : "Autosave"}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {FIELDS.map((field) => (
          <label key={field.key} className="block">
            <span className="mb-2 block text-sm font-label text-carbon">{field.label}</span>
            <textarea
              value={draft[field.key]}
              onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))}
              placeholder={field.placeholder}
              className="min-h-[120px] w-full resize-y rounded-component border border-line bg-white px-3 py-2 text-base text-carbon outline-none transition-all duration-fast ease-fast placeholder:text-graphite focus:border-signal focus:ring-2 focus:ring-signal/20"
            />
          </label>
        ))}
      </div>
    </Card>
  );
}
