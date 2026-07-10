"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Card } from "@/components/ui";
import { useFasesProyecto } from "@/lib/hooks/useFasesProyecto";
import type { CreateFeatureInput, Feature, EstadoFeature, UpdateFeatureInput } from "@/types/features";
import type { FaseProyecto } from "@/types/fases-proyecto";
import { FeatureModal } from "./FeatureModal";
import { FaseColumn } from "./FaseColumn";
import { NuevaFaseForm } from "./NuevaFaseForm";

type LabCanvasProps = {
  projectId: string;
  features: Feature[];
  onCreateFeature: (input: CreateFeatureInput) => Promise<unknown> | void;
  onUpdateFeature: (id: string, input: UpdateFeatureInput) => Promise<unknown> | void;
  onDeleteFeature: (id: string) => Promise<unknown> | void;
  onMoveFeature: (id: string, estado: EstadoFeature) => Promise<{ project?: unknown } | void>;
};

function buildFeaturePhases(features: Feature[]): FaseProyecto[] {
  const phases = new Map<string, FaseProyecto>();

  for (const feature of features) {
    if (!phases.has(feature.fase)) {
      phases.set(feature.fase, {
        id: feature.fase,
        proyecto_id: "",
        nombre: feature.fase,
        estado: "pendiente",
        orden: 1000 + phases.size,
        created_at: new Date(0).toISOString()
      });
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
  const [newPhaseOpen, setNewPhaseOpen] = useState(false);
  const [newPhaseLoading, setNewPhaseLoading] = useState(false);
  const { fases, loading: loadingFases, fetchFases, createFase, updateFase, deleteFase } = useFasesProyecto();

  useEffect(() => {
    void fetchFases(projectId);
  }, [fetchFases, projectId]);

  const fasesDisponibles = useMemo(() => {
    const merged = new Map<string, FaseProyecto>();

    for (const fase of fases) {
      merged.set(fase.id, fase);
    }

    for (const fase of buildFeaturePhases(features)) {
      if (!merged.has(fase.id)) {
        merged.set(fase.id, fase);
      }
    }

    return Array.from(merged.values()).sort((first, second) => {
      if (first.orden !== second.orden) {
        return first.orden - second.orden;
      }

      return first.nombre.localeCompare(second.nombre);
    });
  }, [fases, features]);

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

      {loadingFases && fasesDisponibles.length === 0 ? (
        <Card padding="md">
          <p className="text-sm text-graphite">Cargando fases del proyecto...</p>
        </Card>
      ) : null}

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
            onUpdateFase={async (id, input) => {
              await updateFase(id, input);
            }}
            onDeleteFase={async (id) => {
              await deleteFase(id);
            }}
            onFeatureClick={(feature) => setSelectedFeature(feature)}
          />
        ))}

        {newPhaseOpen ? (
          <NuevaFaseForm
            loading={newPhaseLoading}
            onCancel={() => {
              setNewPhaseOpen(false);
            }}
            onSave={async (input) => {
              setNewPhaseLoading(true);
              try {
                await createFase(projectId, input);
                setNewPhaseOpen(false);
              } finally {
                setNewPhaseLoading(false);
              }
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setNewPhaseOpen(true)}
            className="flex min-w-[320px] max-w-[320px] items-center justify-center rounded-card border border-dashed border-line-soft bg-paper px-4 py-6 text-sm font-label text-graphite transition-colors duration-fast ease-fast hover:bg-white hover:text-carbon"
          >
            + Nueva fase
          </button>
        )}
      </div>

      <FeatureModal
        isOpen={selectedFeature !== null}
        feature={selectedFeature}
        fasesDisponibles={fasesDisponibles}
        defaultFaseId={selectedFeature?.fase ?? ""}
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
