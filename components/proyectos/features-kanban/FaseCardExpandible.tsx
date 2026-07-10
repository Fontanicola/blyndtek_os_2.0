"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Input } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { FaseProyecto, UpdateFaseProyectoInput } from "@/types/fases-proyecto";
import type { EstadoFeature, Feature } from "@/types/features";
import { SubtareaChecklistItem } from "../lab/SubtareaChecklistItem";

function formatDateInput(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function getEstadoVariant(estado: FaseProyecto["estado"]) {
  if (estado === "lista") {
    return "success" as const;
  }

  if (estado === "en_curso") {
    return "signal" as const;
  }

  return "default" as const;
}

type FaseCardExpandibleProps = {
  fase: FaseProyecto;
  subtareas: Feature[];
  fasesDisponibles: FaseProyecto[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEditFase: (input: UpdateFaseProyectoInput) => Promise<void> | void;
  onDeleteFase: () => Promise<void> | void;
  onNuevaSubtarea: () => void;
  onSubtareaEstadoChange: (feature: Feature, estado: EstadoFeature) => Promise<void> | void;
  onSubtareaMoverFase: (feature: Feature, faseId: string) => Promise<void> | void;
  onSubtareaClick: (feature: Feature) => void;
  draggable?: boolean;
  isDragging?: boolean;
  onDragStart?: (fase: FaseProyecto) => void;
  onDragEnd?: () => void;
};

export function FaseCardExpandible({
  fase,
  subtareas,
  fasesDisponibles,
  isExpanded,
  onToggleExpand,
  onEditFase,
  onDeleteFase,
  onNuevaSubtarea,
  onSubtareaEstadoChange,
  onSubtareaMoverFase,
  onSubtareaClick,
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
  const [draftInicio, setDraftInicio] = useState(formatDateInput(fase.fecha_inicio_estimada));
  const [draftFin, setDraftFin] = useState(formatDateInput(fase.fecha_fin_estimada));
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setDraftNombre(fase.nombre);
    setDraftInicio(formatDateInput(fase.fecha_inicio_estimada));
    setDraftFin(formatDateInput(fase.fecha_fin_estimada));
  }, [fase]);

  async function commit() {
    await onEditFase({
      nombre: draftNombre.trim(),
      fecha_inicio_estimada: draftInicio || null,
      fecha_fin_estimada: draftFin || null
    });
    setEditing(false);
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
        className="space-y-3 bg-white shadow-soft"
      >
        <div
          className="space-y-3"
          onClick={() => {
            if (!editing) {
              onToggleExpand();
            }
          }}
        >
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
                  onBlur={() => {
                    void commit();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      event.currentTarget.blur();
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

              <Badge variant={getEstadoVariant(fase.estado)} className="text-[11px]">
                {fase.estado === "pendiente" ? "Pendiente" : fase.estado === "en_curso" ? "En curso" : "Lista"}
              </Badge>

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
                    onBlur={() => {
                      void commit();
                    }}
                    className="h-8 w-auto min-w-[135px]"
                  />
                  <Input
                    type="date"
                    value={draftFin}
                    onChange={(event) => setDraftFin(event.target.value)}
                    onBlur={() => {
                      void commit();
                    }}
                    className="h-8 w-auto min-w-[135px]"
                  />
                </>
              ) : fase.fecha_inicio_estimada || fase.fecha_fin_estimada ? (
                <>
                  <span>{fase.fecha_inicio_estimada ? fase.fecha_inicio_estimada.slice(0, 10) : "Sin inicio"}</span>
                  <span>·</span>
                  <span>{fase.fecha_fin_estimada ? fase.fecha_fin_estimada.slice(0, 10) : "Sin fin"}</span>
                </>
              ) : (
                <span>Sin fechas</span>
              )}
            </div>

            {fase.descripcion || fase.entregables ? (
              <div className="space-y-1 rounded-component bg-paper px-3 py-2">
                {fase.descripcion ? <p className="text-sm text-carbon">{fase.descripcion}</p> : null}
                {fase.entregables ? <p className="text-xs text-graphite">{fase.entregables}</p> : null}
              </div>
            ) : null}

            <div className="space-y-1">
              <div className="h-2 rounded-pill bg-paper">
                <div className="h-2 rounded-pill bg-signal transition-all duration-normal ease-normal" style={{ width: `${progress}%` }} />
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
            {subtareas.length > 0 ? (
              subtareas.map((subtarea) => (
                <SubtareaChecklistItem
                  key={subtarea.id}
                  subtarea={subtarea}
                  fasesDisponibles={fasesDisponibles}
                  onEstadoChange={async (estado) => {
                    await onSubtareaEstadoChange(subtarea, estado);
                  }}
                  onMoverFase={async (faseId) => {
                    await onSubtareaMoverFase(subtarea, faseId);
                  }}
                  onClick={() => onSubtareaClick(subtarea)}
                />
              ))
            ) : (
              <Card padding="sm">
                <p className="text-sm text-graphite">Sin subtareas en esta fase.</p>
              </Card>
            )}

            <Button variant="ghost" size="sm" onClick={onNuevaSubtarea} className="w-full justify-center">
              + Subtarea
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
