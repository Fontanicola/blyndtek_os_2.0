"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui";
import type { CreateFeatureInput, Feature, EstadoFeature, UpdateFeatureInput } from "@/types/features";
import { FeatureModal } from "./FeatureModal";
import { FaseColumn, type FaseProyecto } from "./FaseColumn";

type LabCanvasProps = {
  projectId: string;
  features: Feature[];
  onCreateFeature: (input: CreateFeatureInput) => Promise<void> | void;
  onUpdateFeature: (id: string, input: UpdateFeatureInput) => Promise<void> | void;
  onDeleteFeature: (id: string) => Promise<void> | void;
  onMoveFeature: (id: string, estado: EstadoFeature) => Promise<{ project?: unknown } | void>;
};

function buildFases(features: Feature[]): FaseProyecto[] {
  const phases = new Map<string, FaseProyecto>();

  for (const feature of features) {
    if (!phases.has(feature.fase)) {
      phases.set(feature.fase, { id: feature.fase, nombre: feature.fase });
    }
  }

  return Array.from(phases.values());
}

export function LabCanvas({
  projectId,
  features,
  onCreateFeature,
  onUpdateFeature,
  onDeleteFeature,
  onMoveFeature
}: LabCanvasProps) {
  void onMoveFeature;
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);

  const fasesDisponibles = useMemo(() => buildFases(features), [features]);
  const groupedFeatures = useMemo(
    () =>
      fasesDisponibles.map((fase) => ({
        fase,
        features: features.filter((feature) => feature.fase === fase.id)
      })),
    [features, fasesDisponibles]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-title text-carbon">Fases del proyecto</h3>
          <p className="mt-1 text-sm text-graphite">
            Cada fase se puede colapsar y las subtareas se sincronizan con Tareas automáticamente.
          </p>
        </div>
        <Badge variant="default">{features.length} subtareas</Badge>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {groupedFeatures.map(({ fase, features: phaseFeatures }) => (
          <FaseColumn
            key={fase.id}
            projectId={projectId}
            fase={fase}
            features={phaseFeatures}
            fasesDisponibles={fasesDisponibles}
            onCreateFeature={async (input) => {
              await onCreateFeature({
                ...input,
                proyecto_id: projectId
              });
            }}
            onUpdateFeature={async (id, input) => {
              await onUpdateFeature(id, input);
            }}
            onDeleteFeature={onDeleteFeature}
            onFeatureClick={(feature) => setSelectedFeature(feature)}
          />
        ))}
      </div>

      <FeatureModal
        isOpen={selectedFeature !== null}
        feature={selectedFeature}
        fasesDisponibles={fasesDisponibles}
        onClose={() => setSelectedFeature(null)}
        onSave={async (input) => {
          if (!selectedFeature) {
            return;
          }
          await onUpdateFeature(selectedFeature.id, input);
        }}
        onDelete={async (id) => {
          await onDeleteFeature(id);
        }}
      />
    </div>
  );
}
