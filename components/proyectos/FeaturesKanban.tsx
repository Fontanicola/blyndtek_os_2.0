"use client";

import type { CreateFeatureInput, Feature, EstadoFeature, UpdateFeatureInput } from "@/types/features";
import { LabCanvas } from "./lab/LabCanvas";

type FeaturesKanbanProps = {
  projectId: string;
  features: Feature[];
  onCreateFeature: (input: CreateFeatureInput) => Promise<void> | void;
  onUpdateFeature: (id: string, input: UpdateFeatureInput) => Promise<{ project?: unknown } | void>;
  onDeleteFeature: (id: string) => Promise<void> | void;
  onMoveFeature: (id: string, estado: EstadoFeature) => Promise<{ project?: unknown } | void>;
};

export function FeaturesKanban({
  projectId,
  features,
  onCreateFeature,
  onUpdateFeature,
  onDeleteFeature,
  onMoveFeature
}: FeaturesKanbanProps) {
  return (
    <LabCanvas
      projectId={projectId}
      features={features}
      onCreateFeature={onCreateFeature}
      onUpdateFeature={onUpdateFeature}
      onDeleteFeature={onDeleteFeature}
      onMoveFeature={onMoveFeature}
    />
  );
}
