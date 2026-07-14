"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Input } from "@/components/ui";
import { cn } from "@/lib/cn";
import { CronometroFase } from "./CronometroFase";
import { ChecklistQaSection } from "./ChecklistQaSection";
import { AiDevSection } from "./AiDevSection";
import type { CronometroSesionActiva } from "@/lib/hooks/useCronometro";
import type { FaseProyecto, PrioridadFaseProyecto, UpdateFaseProyectoInput } from "@/types/fases-proyecto";
import type { EstadoFeature, Feature } from "@/types/features";
import type { Usuario } from "@/types/auth";
import type { ProyectoTiempoResponse } from "@/types/sesionesTiempo";
import { SubtareaChecklistItem } from "../lab/SubtareaChecklistItem";

function formatDateInput(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

type FaseCardExpandibleProps = {
  fase: FaseProyecto;
  subtareas: Feature[];
  usuarios?: Array<Pick<Usuario, "id" | "nombre" | "foto_url">>;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEditFase: (input: UpdateFaseProyectoInput) => Promise<void> | void;
  onDeleteFase: () => Promise<void> | void;
  onNuevaSubtarea: () => void;
  onSubtareaEstadoChange: (feature: Feature, estado: EstadoFeature) => Promise<void> | void;
  onSubtareaClick: (feature: Feature) => void;
  tiempoProyecto: ProyectoTiempoResponse | null;
  sesionActiva: CronometroSesionActiva | null;
  tiempoTranscurrido: number;
  onIniciarCronometro: (faseId: string) => Promise<void> | void;
  onPausarCronometro: (sesionId: string, nota?: string) => Promise<void> | void;
  githubRepo?: string | null;
  onRefreshProyecto?: () => Promise<void> | void;
  draggable?: boolean;
  isDragging?: boolean;
  onDragStart?: (fase: FaseProyecto) => void;
  onDragEnd?: () => void;
};

export function FaseCardExpandible({
  fase,
  subtareas,
  usuarios = [],
  isExpanded,
  onToggleExpand,
  onEditFase,
  onDeleteFase,
  onNuevaSubtarea,
  onSubtareaEstadoChange,
  onSubtareaClick,
  tiempoProyecto,
  sesionActiva,
  tiempoTranscurrido,
  onIniciarCronometro,
  onPausarCronometro,
  githubRepo = null,
  onRefreshProyecto,
  draggable = true,
  isDragging = false,
  onDragStart,
  onDragEnd
}: FaseCardExpandibleProps) {
  const completed = useMemo(() => subtareas.filter((item) => item.estado === "lista").length, [subtareas]);
  const total = subtareas.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const [editing, setEditing] = useState(false);
  const [draftNombre, setDraftNombre] = useState(fase.nombre);
  const [draftInicio, setDraftInicio] = useState(formatDateInput(fase.fecha_estimada_inicio));
  const [draftFin, setDraftFin] = useState(formatDateInput(fase.fecha_estimada_fin));
  const [menuOpen, setMenuOpen] = useState(false);
  const [priorityMenuOpen, setPriorityMenuOpen] = useState(false);

  function getResponsableUsuario(userId: string | null) {
    if (!userId) {
      return null;
    }

    return usuarios.find((usuario) => usuario.id === userId) ?? null;
  }

  useEffect(() => {
    setDraftNombre(fase.nombre);
    setDraftInicio(formatDateInput(fase.fecha_estimada_inicio));
    setDraftFin(formatDateInput(fase.fecha_estimada_fin));
  }, [fase]);

  async function commitHeader() {
    await onEditFase({
      nombre: draftNombre.trim(),
      fecha_estimada_inicio: draftInicio || null,
      fecha_estimada_fin: draftFin || null
    });
    setEditing(false);
    setMenuOpen(false);
    setPriorityMenuOpen(false);
  }

  function cancelHeaderEdit() {
    setDraftNombre(fase.nombre);
    setDraftInicio(formatDateInput(fase.fecha_estimada_inicio));
    setDraftFin(formatDateInput(fase.fecha_estimada_fin));
    setEditing(false);
    setMenuOpen(false);
    setPriorityMenuOpen(false);
  }

  async function updatePriority(prioridad: PrioridadFaseProyecto) {
    await onEditFase({ prioridad });
    setPriorityMenuOpen(false);
    setMenuOpen(false);
  }

  return (
    <div
      draggable={draggable}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", fase.id);
        onDragStart?.(fase);
      }}
      onDragEnd={onDragEnd}
      className={cn("transition-all duration-fast ease-fast", isDragging && "opacity-50")}
    >
      <Card
        padding="sm"
        className={cn(
          "space-y-3 shadow-soft transition-all duration-fast ease-fast",
          fase.estado === "lista"
            ? "!bg-white"
            : fase.prioridad === "alta"
              ? "!bg-danger-light"
              : fase.prioridad === "media"
                ? "!bg-warning-light"
                : "!bg-paper"
        )}
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggleExpand();
              }}
              className="mt-0.5 text-sm text-graphite"
              aria-label={isExpanded ? "Colapsar fase" : "Expandir fase"}
            >
              {isExpanded ? "▾" : "▸"}
            </button>

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {editing ? (
                  <Input
                    autoFocus
                    value={draftNombre}
                    onChange={(event) => setDraftNombre(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void commitHeader();
                      }
                      if (event.key === "Escape") {
                        event.preventDefault();
                        cancelHeaderEdit();
                      }
                    }}
                    className="h-9 flex-1 min-w-[180px]"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setEditing(true);
                    }}
                    className="min-w-0 truncate text-left text-base font-label text-carbon"
                    title="Click para editar"
                  >
                    {fase.nombre}
                  </button>
                )}

                <span className="text-xs text-graphite">
                  {completed}/{total} completadas
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-graphite">
                {editing ? (
                  <>
                    <Input
                      type="date"
                      value={draftInicio}
                      onChange={(event) => setDraftInicio(event.target.value)}
                      className="h-8 w-auto min-w-[135px]"
                    />
                    <Input
                      type="date"
                      value={draftFin}
                      onChange={(event) => setDraftFin(event.target.value)}
                      className="h-8 w-auto min-w-[135px]"
                    />
                  </>
                ) : fase.fecha_estimada_inicio || fase.fecha_estimada_fin ? (
                  <>
                    <span>{fase.fecha_estimada_inicio ? fase.fecha_estimada_inicio.slice(0, 10) : "Sin inicio"}</span>
                    <span>·</span>
                    <span>{fase.fecha_estimada_fin ? fase.fecha_estimada_fin.slice(0, 10) : "Sin fin"}</span>
                  </>
                ) : (
                  <span>Sin fechas</span>
                )}
              </div>

              {editing ? (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button type="button" variant="primary" size="sm" onClick={() => void commitHeader()}>
                    Guardar
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={cancelHeaderEdit}>
                    Cancelar
                  </Button>
                </div>
              ) : null}

              <div className="space-y-1">
                <div className="h-2 rounded-pill bg-paper">
                  <div
                    className="h-2 rounded-pill bg-signal transition-all duration-normal ease-normal"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-graphite">
                  {progress}% · {completed}/{total} completadas
                </p>
              </div>
            </div>

            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 px-0 py-0"
                onClick={(event) => {
                  event.stopPropagation();
                  setMenuOpen((current) => !current);
                }}
              >
                ⋮
              </Button>

              {menuOpen ? (
                <div className="absolute right-0 top-full z-20 mt-2 w-44 rounded-card border border-line bg-white p-2 shadow-modal">
                  <button
                    type="button"
                    className="w-full rounded-component px-3 py-2 text-left text-sm text-carbon transition-colors duration-fast ease-fast hover:bg-paper"
                    onClick={(event) => {
                      event.stopPropagation();
                      setMenuOpen(false);
                      setEditing(true);
                    }}
                  >
                    Editar fase
                  </button>
                  <div className="relative">
                    <button
                      type="button"
                      className="w-full rounded-component px-3 py-2 text-left text-sm text-carbon transition-colors duration-fast ease-fast hover:bg-paper"
                      onClick={(event) => {
                        event.stopPropagation();
                        setPriorityMenuOpen((current) => !current);
                      }}
                    >
                      Cambiar prioridad
                    </button>
                    {priorityMenuOpen ? (
                      <div className="mt-1 space-y-1 rounded-component border border-line-soft bg-white p-1">
                        {(["alta", "media", "baja"] as const).map((prioridad) => (
                          <button
                            key={prioridad}
                            type="button"
                            className="w-full rounded-component px-3 py-2 text-left text-sm text-carbon transition-colors duration-fast ease-fast hover:bg-paper"
                            onClick={async (event) => {
                              event.stopPropagation();
                              await updatePriority(prioridad);
                            }}
                          >
                            {prioridad === "alta" ? "Alta" : prioridad === "media" ? "Media" : "Baja"}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="w-full rounded-component px-3 py-2 text-left text-sm text-danger transition-colors duration-fast ease-fast hover:bg-danger-light"
                    onClick={async (event) => {
                      event.stopPropagation();
                      const confirmed = window.confirm("¿Eliminar esta fase? Las subtareas quedarán sin fase.");
                      if (!confirmed) {
                        return;
                      }

                      await onDeleteFase();
                    }}
                  >
                    Eliminar fase
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div
          className={cn(
            "overflow-hidden transition-[max-height,opacity] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
            isExpanded ? "max-h-[2200px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="space-y-2 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <CronometroFase
                fase={fase}
                tiempoProyecto={tiempoProyecto}
                sesionActiva={sesionActiva}
                tiempoTranscurrido={tiempoTranscurrido}
                onIniciar={onIniciarCronometro}
                onPausar={onPausarCronometro}
              />

              <ChecklistQaSection faseId={fase.id} enabled={isExpanded} />
            </div>

            <AiDevSection
              fase={fase}
              githubRepo={githubRepo}
              onRefresh={async () => {
                await onRefreshProyecto?.();
              }}
            />

            <div className="space-y-2">
              {subtareas.length > 0
                ? subtareas.map((subtarea) => (
                    <SubtareaChecklistItem
                      key={subtarea.id}
                      subtarea={subtarea}
                      responsableUsuario={getResponsableUsuario(subtarea.responsable_id)}
                      onEstadoChange={async (estado) => {
                        await onSubtareaEstadoChange(subtarea, estado);
                      }}
                      onClick={() => onSubtareaClick(subtarea)}
                    />
                  ))
                : null}

              <Button variant="ghost" size="sm" onClick={onNuevaSubtarea} className="w-full justify-center">
                + Subtarea
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
