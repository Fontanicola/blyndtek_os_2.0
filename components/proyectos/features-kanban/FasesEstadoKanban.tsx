"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useFeatures } from "@/lib/hooks/useFeatures";
import { useFasesProyecto } from "@/lib/hooks/useFasesProyecto";
import { migrarSiNecesario } from "@/lib/proyectos/migrarSiNecesario";
import type { EstadoFaseProyecto, FaseProyecto, UpdateFaseProyectoInput } from "@/types/fases-proyecto";
import type { Feature } from "@/types/features";
import type { Proyecto } from "@/types/proyectos";
import { FeatureModal } from "../lab/FeatureModal";
import { NuevaFaseForm } from "../lab/NuevaFaseForm";
import { FaseCardExpandible } from "./FaseCardExpandible";

const estados: Array<{ estado: EstadoFaseProyecto; label: string }> = [
  { estado: "pendiente", label: "Pendiente" },
  { estado: "en_curso", label: "En curso" },
  { estado: "lista", label: "Lista" }
];

function sortFases(fases: FaseProyecto[]) {
  return [...fases].sort((first, second) => first.orden - second.orden || first.nombre.localeCompare(second.nombre));
}

type FasesEstadoKanbanProps = {
  proyecto: Proyecto;
};

export function FasesEstadoKanban({ proyecto }: FasesEstadoKanbanProps) {
  const { fases, loading: loadingFases, fetchFases, createFase, updateFase, deleteFase, updateEstadoFase } =
    useFasesProyecto();
  const { features, loading: loadingFeatures, fetchFeatures, createFeature, updateFeature, deleteFeature } =
    useFeatures();
  const [expandedById, setExpandedById] = useState<Record<string, boolean>>({});
  const [draggedFaseId, setDraggedFaseId] = useState<string | null>(null);
  const [dropTargetEstado, setDropTargetEstado] = useState<EstadoFaseProyecto | null>(null);
  const [newPhaseOpen, setNewPhaseOpen] = useState(false);
  const [newPhaseLoading, setNewPhaseLoading] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [creatingFeaturePhaseId, setCreatingFeaturePhaseId] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([fetchFases(proyecto.id), fetchFeatures(proyecto.id)]);
  }, [fetchFeatures, fetchFases, proyecto.id]);

  const fasesDisponibles = useMemo(() => sortFases(migrarSiNecesario(fases, features)), [fases, features]);

  const featuresByFase = useMemo(() => {
    const grouped = new Map<string, Feature[]>();

    for (const fase of fasesDisponibles) {
      grouped.set(fase.id, []);
    }

    for (const feature of features) {
      const current = grouped.get(feature.fase) ?? [];
      grouped.set(feature.fase, [...current, feature]);
    }

    return grouped;
  }, [features, fasesDisponibles]);

  useEffect(() => {
    setExpandedById((current) => {
      const next = { ...current };

      for (const fase of fasesDisponibles) {
        if (typeof next[fase.id] === "undefined") {
          next[fase.id] = (featuresByFase.get(fase.id)?.length ?? 0) > 0 || fase.estado !== "pendiente";
        }
      }

      for (const faseId of Object.keys(next)) {
        if (!fasesDisponibles.some((fase) => fase.id === faseId)) {
          delete next[faseId];
        }
      }

      return next;
    });
  }, [fasesDisponibles, featuresByFase]);

  const groupedByEstado = useMemo(
    () =>
      estados.map(({ estado, label }) => ({
        estado,
        label,
        fases: fasesDisponibles.filter((fase) => fase.estado === estado)
      })),
    [fasesDisponibles]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-title text-carbon">Features</h3>
          <p className="mt-1 text-sm text-graphite">
            Fases del proyecto organizadas por estado. Cada card puede expandirse para editar sus subtareas.
          </p>
        </div>
        <Badge variant="default">{features.length} subtareas</Badge>
      </div>

      {loadingFases || loadingFeatures ? (
        <Card padding="md">
          <p className="text-sm text-graphite">Cargando fases y subtareas del proyecto...</p>
        </Card>
      ) : null}

      <div className="grid grid-cols-3 gap-4">
        {groupedByEstado.map(({ estado, label, fases: fasesEstado }) => (
          <section
            key={estado}
            className={cn(
              "flex min-h-[560px] w-full flex-col rounded-card bg-paper p-3 transition-all duration-fast ease-fast",
              dropTargetEstado === estado && "ring-2 ring-signal"
            )}
            onDragOver={(event) => {
              event.preventDefault();
              setDropTargetEstado(estado);
            }}
            onDragLeave={() => {
              setDropTargetEstado((current) => (current === estado ? null : current));
            }}
            onDrop={async (event) => {
              event.preventDefault();
              const faseId = draggedFaseId ?? event.dataTransfer.getData("text/plain");

              if (faseId) {
                await updateEstadoFase(faseId, estado);
              }

              setDraggedFaseId(null);
              setDropTargetEstado(null);
            }}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-label text-graphite">{label}</h3>
                <Badge variant="default">{fasesEstado.length}</Badge>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {fasesEstado.length > 0 ? (
                fasesEstado.map((fase) => (
                  <FaseCardExpandible
                    key={fase.id}
                    fase={fase}
                    subtareas={featuresByFase.get(fase.id) ?? []}
                    fasesDisponibles={fasesDisponibles}
                    isExpanded={expandedById[fase.id] ?? false}
                    onToggleExpand={() => {
                      setExpandedById((current) => ({ ...current, [fase.id]: !current[fase.id] }));
                    }}
                    onEditFase={async (input: UpdateFaseProyectoInput) => {
                      await updateFase(fase.id, input);
                    }}
                    onDeleteFase={async () => {
                      await deleteFase(fase.id);
                    }}
                    onNuevaSubtarea={() => {
                      setCreatingFeaturePhaseId(fase.id);
                      setSelectedFeature(null);
                    }}
                    onSubtareaEstadoChange={async (feature, estadoFeature) => {
                      await updateFeature(feature.id, { estado: estadoFeature });
                    }}
                    onSubtareaMoverFase={async (feature, nuevaFaseId) => {
                      await updateFeature(feature.id, { fase: nuevaFaseId });
                    }}
                    onSubtareaClick={(feature) => {
                      setCreatingFeaturePhaseId(null);
                      setSelectedFeature(feature);
                    }}
                    draggable
                    isDragging={draggedFaseId === fase.id}
                    onDragStart={(current) => setDraggedFaseId(current.id)}
                    onDragEnd={() => setDraggedFaseId(null)}
                  />
                ))
              ) : (
                <Card padding="sm">
                  <p className="text-sm text-graphite">Sin fases en esta columna.</p>
                </Card>
              )}
            </div>

            {estado === "pendiente" ? (
              <div className="pt-3">
                {newPhaseOpen ? (
                  <NuevaFaseForm
                    loading={newPhaseLoading}
                    onCancel={() => setNewPhaseOpen(false)}
                    onSave={async (input) => {
                      setNewPhaseLoading(true);
                      try {
                        await createFase(proyecto.id, {
                          ...input,
                          estado: "pendiente"
                        });
                        setNewPhaseOpen(false);
                      } finally {
                        setNewPhaseLoading(false);
                      }
                    }}
                  />
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNewPhaseOpen(true)}
                    className="w-full justify-center"
                  >
                    + Fase
                  </Button>
                )}
              </div>
            ) : null}
          </section>
        ))}
      </div>

      <FeatureModal
        isOpen={selectedFeature !== null || creatingFeaturePhaseId !== null}
        feature={selectedFeature}
        fasesDisponibles={fasesDisponibles}
        defaultEstado="pendiente"
        defaultFaseId={creatingFeaturePhaseId ?? selectedFeature?.fase ?? ""}
        onClose={() => {
          setSelectedFeature(null);
          setCreatingFeaturePhaseId(null);
        }}
        onSave={async (input) => {
          if (selectedFeature) {
            await updateFeature(selectedFeature.id, input);
          } else {
            await createFeature(proyecto.id, {
              proyecto_id: proyecto.id,
              nombre: input.nombre?.trim() ?? "",
              descripcion: input.descripcion?.trim() ?? "",
              fase: input.fase?.trim() ?? creatingFeaturePhaseId ?? "",
              estado: input.estado,
              responsable_id: input.responsable_id ?? undefined
            });
          }

          setSelectedFeature(null);
          setCreatingFeaturePhaseId(null);
        }}
        onDelete={async (id) => {
          await deleteFeature(id);
          setSelectedFeature(null);
        }}
      />
    </div>
  );
}
