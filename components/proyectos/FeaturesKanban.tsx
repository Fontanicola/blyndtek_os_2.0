"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card, Input } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { CreateFeatureInput, Feature, EstadoFeature } from "@/types/features";
import { FeatureCard } from "./FeatureCard";

type FeaturesKanbanProps = {
  projectId: string;
  features: Feature[];
  onCreateFeature: (input: CreateFeatureInput) => Promise<void> | void;
  onUpdateFeature: (id: string, input: Partial<Feature>) => Promise<{ project?: unknown } | void>;
  onDeleteFeature: (id: string) => Promise<void> | void;
  onMoveFeature: (id: string, estado: EstadoFeature) => Promise<{ project?: unknown } | void>;
};

const columns: Array<{ estado: EstadoFeature; label: string }> = [
  { estado: "pendiente", label: "Pendiente" },
  { estado: "en_curso", label: "En curso" },
  { estado: "lista", label: "Lista" }
];

function groupByPhase(features: Feature[]) {
  const grouped = features.reduce<Map<string, Feature[]>>((accumulator, feature) => {
    const current = accumulator.get(feature.fase) ?? [];
    accumulator.set(feature.fase, [...current, feature]);
    return accumulator;
  }, new Map<string, Feature[]>());

  return Array.from(grouped.entries()).map(([fase, items]) => ({
    fase,
    features: items
  }));
}

function QuickFeatureForm({
  onCancel,
  onSave
}: {
  onCancel: () => void;
  onSave: (input: Omit<CreateFeatureInput, "proyecto_id">) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fase, setFase] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <Card padding="sm" className="space-y-3 bg-white shadow-soft">
      <Input label="Nombre" value={nombre} onChange={(event) => setNombre(event.target.value)} />
      <Input label="Fase" value={fase} onChange={(event) => setFase(event.target.value)} />
      <div className="space-y-1">
        <label className="text-sm font-label text-carbon">Descripción</label>
        <textarea
          value={descripcion}
          onChange={(event) => setDescripcion(event.target.value)}
          className="min-h-[90px] w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon transition-all duration-fast ease-fast focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          size="sm"
          loading={loading}
          onClick={async () => {
            if (!nombre.trim() || !descripcion.trim() || !fase.trim()) {
              return;
            }

            setLoading(true);
            try {
              onSave({
                nombre: nombre.trim(),
                descripcion: descripcion.trim(),
                fase: fase.trim(),
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

export function FeaturesKanban({
  projectId,
  features,
  onCreateFeature,
  onUpdateFeature,
  onDeleteFeature,
  onMoveFeature
}: FeaturesKanbanProps) {
  void onUpdateFeature;
  void onDeleteFeature;
  const [draggedFeatureId, setDraggedFeatureId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<EstadoFeature | null>(null);
  const [quickAdd, setQuickAdd] = useState<EstadoFeature | null>(null);

  const groupedColumns = useMemo(
    () =>
      columns.map((column) => ({
        ...column,
        features: features.filter((feature) => feature.estado === column.estado)
      })),
    [features]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-title text-carbon">Features</h3>
          <p className="mt-1 text-sm text-graphite">
            Arrastrá las features entre estados y el avance se recalcula automáticamente.
          </p>
        </div>
        <Badge variant="default">{features.length} features</Badge>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {groupedColumns.map((column) => {
          const phaseGroups = groupByPhase(column.features);

          return (
            <section
              key={column.estado}
              className={cn(
                "flex min-h-[520px] min-w-[300px] max-w-[300px] flex-col rounded-card bg-paper p-3 transition-all duration-fast ease-fast",
                dropTarget === column.estado && "ring-2 ring-signal"
              )}
              onDragOver={(event) => {
                event.preventDefault();
                setDropTarget(column.estado);
              }}
              onDragLeave={() => {
                setDropTarget((current) => (current === column.estado ? null : current));
              }}
              onDrop={async (event) => {
                event.preventDefault();
                if (draggedFeatureId) {
                  await onMoveFeature(draggedFeatureId, column.estado);
                }
                setDraggedFeatureId(null);
                setDropTarget(null);
              }}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-label text-graphite">{column.label}</h4>
                  <Badge variant="default">{column.features.length}</Badge>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {phaseGroups.length > 0 ? (
                  phaseGroups.map(({ fase, features: phaseFeatures }) => (
                    <div key={fase} className="space-y-2">
                      <p className="text-[11px] font-label uppercase tracking-[0.08em] text-graphite">
                        {fase}
                      </p>
                      <div className="space-y-2">
                        {phaseFeatures.map((feature) => (
                          <FeatureCard
                            key={feature.id}
                            feature={feature}
                            draggable
                            isDragging={draggedFeatureId === feature.id}
                            onDragStart={(current) => setDraggedFeatureId(current.id)}
                            onDragEnd={() => setDraggedFeatureId(null)}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <Card padding="sm">
                    <p className="text-sm text-graphite">Sin features en esta columna.</p>
                  </Card>
                )}

                {quickAdd === column.estado ? (
                  <QuickFeatureForm
                    onCancel={() => setQuickAdd(null)}
                    onSave={async (input) => {
                      await onCreateFeature({
                        proyecto_id: projectId,
                        nombre: input.nombre,
                        descripcion: input.descripcion,
                        fase: input.fase,
                        estado: column.estado
                      });
                      setQuickAdd(null);
                    }}
                  />
                ) : null}
              </div>

              <div className="pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setQuickAdd(column.estado)}
                  className="w-full justify-center"
                >
                  + Feature
                </Button>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
