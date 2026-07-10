"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { Usuario } from "@/types/auth";
import type { FaseProyecto } from "@/types/fases-proyecto";
import type { CreateFeatureInput, EstadoFeature, Feature, UpdateFeatureInput } from "@/types/features";
import { FeatureCard } from "./FeatureCard";
import { FeatureModal } from "./lab/FeatureModal";

const columns: Array<{ estado: EstadoFeature; label: string }> = [
  { estado: "pendiente", label: "Pendiente" },
  { estado: "en_curso", label: "En curso" },
  { estado: "lista", label: "Lista" }
];

type FeaturesKanbanProps = {
  projectId: string;
  features: Feature[];
  fasesDisponibles: FaseProyecto[];
  usuarios: Array<Pick<Usuario, "id" | "nombre" | "email" | "rol">>;
  onCreateFeature: (input: CreateFeatureInput) => Promise<unknown> | void;
  onUpdateFeature: (id: string, input: UpdateFeatureInput) => Promise<unknown> | void;
  onDeleteFeature: (id: string) => Promise<unknown> | void;
  onMoveFeature?: (id: string, estado: EstadoFeature) => Promise<unknown> | void;
};

function getFaseLabel(feature: Feature, fasesDisponibles: FaseProyecto[]) {
  const fase = fasesDisponibles.find((item) => item.id === feature.fase);
  return fase?.nombre ?? (feature.fase?.trim() ? feature.fase : null);
}

function sortFases(fasesDisponibles: FaseProyecto[]) {
  return [...fasesDisponibles].sort(
    (first, second) => first.orden - second.orden || first.nombre.localeCompare(second.nombre)
  );
}

export function FeaturesKanban({
  projectId,
  features,
  fasesDisponibles,
  usuarios,
  onCreateFeature,
  onUpdateFeature,
  onDeleteFeature,
  onMoveFeature
}: FeaturesKanbanProps) {
  const [draggedFeatureId, setDraggedFeatureId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<EstadoFeature | null>(null);
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState("");
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [createDraft, setCreateDraft] = useState<{ estado: EstadoFeature; faseId: string } | null>(null);

  useEffect(() => {
    if (!editingFeature) {
      return;
    }

    setEditingFeature(features.find((feature) => feature.id === editingFeature.id) ?? null);
  }, [editingFeature, features]);

  const phaseOptions = useMemo(() => sortFases(fasesDisponibles), [fasesDisponibles]);

  const visibleFeatures = useMemo(() => {
    if (!selectedPhaseFilter) {
      return features;
    }

    return features.filter((feature) => feature.fase === selectedPhaseFilter);
  }, [features, selectedPhaseFilter]);

  const grouped = useMemo(
    () =>
      columns.map((column) => ({
        ...column,
        features: visibleFeatures.filter((feature) => feature.estado === column.estado)
      })),
    [visibleFeatures]
  );

  const activeFeature = editingFeature ?? null;
  const isCreateOpen = createDraft !== null;
  const isEditOpen = activeFeature !== null;
  const modalPhaseDefault = createDraft?.faseId ?? selectedPhaseFilter;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-title text-carbon">Features</h3>
          <p className="mt-1 text-sm text-graphite">
            Organizadas por estado, con la fase como metadato y filtro opcional.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedPhaseFilter}
            onChange={(event) => setSelectedPhaseFilter(event.target.value)}
            className="min-w-[220px] rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
          >
            <option value="">Todas las fases</option>
            {phaseOptions.map((fase) => (
              <option key={fase.id} value={fase.id}>
                {fase.nombre}
              </option>
            ))}
          </select>
          <Badge variant="default">{visibleFeatures.length} subtareas</Badge>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {grouped.map((column) => (
          <section
            key={column.estado}
            className={cn(
              "flex min-h-[560px] w-full flex-col rounded-card bg-paper p-3 transition-all duration-fast ease-fast",
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
              const featureId = draggedFeatureId ?? event.dataTransfer.getData("text/plain");

              if (featureId) {
                if (onMoveFeature) {
                  await onMoveFeature(featureId, column.estado);
                } else {
                  await onUpdateFeature(featureId, { estado: column.estado });
                }
              }

              setDraggedFeatureId(null);
              setDropTarget(null);
            }}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-label text-graphite">{column.label}</h3>
                <Badge variant="default">{column.features.length}</Badge>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {column.features.length > 0 ? (
                column.features.map((feature) => (
                  <FeatureCard
                    key={feature.id}
                    feature={feature}
                    faseLabel={getFaseLabel(feature, fasesDisponibles)}
                    onClick={() => setEditingFeature(feature)}
                    draggable
                    isDragging={draggedFeatureId === feature.id}
                    onDragStart={(current) => setDraggedFeatureId(current.id)}
                    onDragEnd={() => setDraggedFeatureId(null)}
                  />
                ))
              ) : (
                <Card padding="sm">
                  <p className="text-sm text-graphite">Sin subtareas en esta columna.</p>
                </Card>
              )}
            </div>

            <div className="pt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCreateDraft({ estado: column.estado, faseId: selectedPhaseFilter })}
                className="w-full justify-center"
              >
                + Subtarea
              </Button>
            </div>
          </section>
        ))}
      </div>

      <FeatureModal
        isOpen={isEditOpen || isCreateOpen}
        feature={activeFeature}
        fasesDisponibles={phaseOptions}
        usuarios={usuarios}
        defaultEstado={createDraft?.estado ?? "pendiente"}
        defaultFaseId={modalPhaseDefault}
        onClose={() => {
          setEditingFeature(null);
          setCreateDraft(null);
        }}
        onSave={async (input) => {
          if (activeFeature) {
            await onUpdateFeature(activeFeature.id, input);
          } else {
            await onCreateFeature({
              proyecto_id: projectId,
              nombre: input.nombre?.trim() ?? "",
              descripcion: input.descripcion?.trim() ?? "",
              fase: input.fase?.trim() ?? "",
              estado: input.estado,
              responsable_id: input.responsable_id ?? undefined
            });
          }

          setEditingFeature(null);
          setCreateDraft(null);
        }}
        onDelete={async (id) => {
          await onDeleteFeature(id);
          setEditingFeature(null);
        }}
      />
    </div>
  );
}
