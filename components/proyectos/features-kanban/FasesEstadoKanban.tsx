"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Toast } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useFeatures } from "@/lib/hooks/useFeatures";
import { useFasesProyecto } from "@/lib/hooks/useFasesProyecto";
import { migrarSiNecesario } from "@/lib/proyectos/migrarSiNecesario";
import type { EstadoFaseProyecto, FaseProyecto, UpdateFaseProyectoInput } from "@/types/fases-proyecto";
import type { Feature } from "@/types/features";
import type { Proyecto } from "@/types/proyectos";
import type { Usuario } from "@/types/auth";
import type { CronometroSesionActiva } from "@/lib/hooks/useCronometro";
import type { ProyectoTiempoResponse } from "@/types/sesionesTiempo";
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
  tiempoProyecto: ProyectoTiempoResponse | null;
  sesionActiva: CronometroSesionActiva | null;
  tiempoTranscurrido: number;
  usuarios: Array<Pick<Usuario, "id" | "nombre" | "foto_url">>;
  onIniciarCronometro: (faseId: string) => Promise<void> | void;
  onPausarCronometro: (sesionId: string, nota?: string) => Promise<void> | void;
};

export function FasesEstadoKanban({
  proyecto,
  tiempoProyecto,
  sesionActiva,
  tiempoTranscurrido,
  usuarios,
  onIniciarCronometro,
  onPausarCronometro
}: FasesEstadoKanbanProps) {
  const {
    fases,
    loading: loadingFases,
    fetchFases,
    createFase,
    updateFase,
    deleteFase,
    updateEstadoFase,
    setFases
  } =
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
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "info" | "warning" | "error";
  }>({
    visible: false,
    message: "",
    type: "success"
  });

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
      const current = grouped.get(feature.fase_id) ?? [];
      grouped.set(feature.fase_id, [...current, feature]);
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

  async function handleDrop(faseId: string, estado: EstadoFaseProyecto) {
    const previousFases = fases;

    setFases((current) => current.map((fase) => (fase.id === faseId ? { ...fase, estado } : fase)));

    try {
      await updateEstadoFase(faseId, estado);
    } catch (error) {
      setFases(previousFases);
      setToast({
        visible: true,
        message: error instanceof Error ? error.message : "No se pudo actualizar la fase.",
        type: "error"
      });
      throw error;
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-title text-carbon">Features</h3>
        <Badge variant="default">{features.length} subtareas</Badge>
      </div>

      {loadingFases || loadingFeatures ? (
        <Card padding="md">
          <p className="text-sm text-graphite">Cargando fases y subtareas del proyecto...</p>
        </Card>
      ) : null}

      <div className="grid flex-1 min-h-0 items-stretch grid-cols-3 gap-4">
        {groupedByEstado.map(({ estado, label, fases: fasesEstado }) => (
          <section
            key={estado}
            className={cn(
              "flex h-full min-h-0 w-full flex-col overflow-hidden rounded-card bg-paper p-3 transition-all duration-fast ease-fast",
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
                try {
                  await handleDrop(faseId, estado);
                } catch {
                  // El toast y el rollback ya se manejaron en handleDrop.
                }
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

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {fasesEstado.length > 0 ? (
                fasesEstado.map((fase) => (
                  <FaseCardExpandible
                    key={fase.id}
                    fase={fase}
                    subtareas={featuresByFase.get(fase.id) ?? []}
                    usuarios={usuarios}
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
                    onSubtareaClick={(feature) => {
                      setCreatingFeaturePhaseId(null);
                      setSelectedFeature(feature);
                    }}
                    tiempoProyecto={tiempoProyecto}
                    sesionActiva={sesionActiva}
                    tiempoTranscurrido={tiempoTranscurrido}
                    onIniciarCronometro={onIniciarCronometro}
                    onPausarCronometro={onPausarCronometro}
                    githubRepo={proyecto.github_repo}
                    onRefreshProyecto={async () => {
                      await fetchFases(proyecto.id);
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
        defaultFaseId={creatingFeaturePhaseId ?? selectedFeature?.fase_id ?? ""}
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
              fase_id: input.fase_id?.trim() ?? creatingFeaturePhaseId ?? "",
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

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((current) => ({ ...current, visible: false }))}
      />
    </div>
  );
}
