"use client";

import { useMemo, useState } from "react";
import { Button, Card } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { CreateFeatureInput, Feature, UpdateFeatureInput } from "@/types/features";
import { SubtareaChecklistItem, type FaseProyecto } from "./SubtareaChecklistItem";

export type { FaseProyecto } from "./SubtareaChecklistItem";

type FaseColumnProps = {
  projectId: string;
  fase: FaseProyecto;
  features: Feature[];
  fasesDisponibles: FaseProyecto[];
  onCreateFeature: (input: CreateFeatureInput) => Promise<unknown> | void;
  onUpdateFeature: (id: string, input: UpdateFeatureInput) => Promise<unknown> | void;
  onFeatureClick: (feature: Feature) => void;
};

function QuickSubtareaForm({
  faseId,
  onCancel,
  onSave
}: {
  faseId: string;
  onCancel: () => void;
  onSave: (input: Omit<CreateFeatureInput, "proyecto_id">) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <Card padding="sm" className="space-y-3 bg-white shadow-soft">
      <input
        value={nombre}
        onChange={(event) => setNombre(event.target.value)}
        placeholder="Nombre de la subtarea"
        className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
      />
      <textarea
        value={descripcion}
        onChange={(event) => setDescripcion(event.target.value)}
        placeholder="Descripción"
        className="min-h-[80px] w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          size="sm"
          loading={loading}
          onClick={async () => {
            if (!nombre.trim() || !descripcion.trim()) {
              return;
            }

            setLoading(true);
            try {
              await onSave({
                nombre: nombre.trim(),
                descripcion: descripcion.trim(),
                fase: faseId,
                estado: "pendiente"
              });
            } finally {
              setLoading(false);
            }
          }}
        >
          Crear
        </Button>
      </div>
    </Card>
  );
}

export function FaseColumn({
  projectId,
  fase,
  features,
  fasesDisponibles,
  onCreateFeature,
  onUpdateFeature,
  onFeatureClick
}: FaseColumnProps) {
  const completed = useMemo(() => features.filter((feature) => feature.estado === "lista").length, [features]);
  const total = features.length;
  const [isExpanded, setIsExpanded] = useState(() => features.some((feature) => feature.estado !== "pendiente"));
  const [quickAdd, setQuickAdd] = useState(false);

  return (
    <section className="flex min-w-[320px] max-w-[320px] flex-col rounded-card bg-paper p-3">
      <div className="space-y-3 rounded-card bg-white p-4 shadow-soft">
        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          className="flex w-full items-start justify-between gap-3 text-left"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-base font-label text-carbon">{fase.nombre}</span>
              <span className="text-xs text-graphite">
                {completed}/{total} completadas
              </span>
            </div>
            <p className="mt-1 text-xs text-graphite">
              {total > 0 ? `${Math.round((completed / total) * 100)}% completado` : "Sin subtareas"}
            </p>
          </div>
          <span className="text-sm text-graphite">{isExpanded ? "▾" : "▸"}</span>
        </button>

        <div className="h-2 rounded-pill bg-paper">
          <div
            className="h-2 rounded-pill bg-signal transition-all duration-normal ease-normal"
            style={{ width: `${total > 0 ? Math.round((completed / total) * 100) : 0}%` }}
          />
        </div>

        <div
          className={cn(
            "overflow-hidden transition-[max-height,opacity] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
            isExpanded ? "max-h-[1800px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="space-y-2 pt-2">
            {features.length > 0 ? (
              features.map((feature) => (
                <SubtareaChecklistItem
                  key={feature.id}
                  subtarea={feature}
                  fasesDisponibles={fasesDisponibles}
                  onEstadoChange={async (estado) => {
                    await onUpdateFeature(feature.id, { estado });
                  }}
                  onMoverFase={async (nuevaFase) => {
                    await onUpdateFeature(feature.id, { fase: nuevaFase });
                  }}
                  onClick={() => onFeatureClick(feature)}
                />
              ))
            ) : (
              <Card padding="sm">
                <p className="text-sm text-graphite">Sin subtareas en esta fase.</p>
              </Card>
            )}

            {quickAdd ? (
              <QuickSubtareaForm
                faseId={fase.id}
                onCancel={() => setQuickAdd(false)}
                onSave={async (input) => {
                  await onCreateFeature({
                    proyecto_id: projectId,
                    ...input,
                  });
                  setQuickAdd(false);
                }}
              />
            ) : null}
          </div>
        </div>

        <div className={cn("pt-1", !isExpanded && "hidden")}>
          <Button variant="ghost" size="sm" onClick={() => setQuickAdd(true)} className="w-full justify-center">
            + Subtarea
          </Button>
        </div>
      </div>
    </section>
  );
}
