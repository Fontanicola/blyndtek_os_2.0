"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Input } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { FaseProyecto, UpdateFaseProyectoInput } from "@/types/fases-proyecto";
import type { CreateFeatureInput, Feature, UpdateFeatureInput } from "@/types/features";
import { SubtareaChecklistItem } from "./SubtareaChecklistItem";

type FaseColumnProps = {
  projectId: string;
  fase: FaseProyecto;
  features: Feature[];
  onCreateFeature: (input: CreateFeatureInput) => Promise<unknown> | void;
  onUpdateFeature: (id: string, input: UpdateFeatureInput) => Promise<unknown> | void;
  onUpdateFase: (id: string, input: UpdateFaseProyectoInput) => Promise<void> | void;
  onDeleteFase: (id: string) => Promise<void> | void;
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
                fase_id: faseId,
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

function formatDateInput(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

export function FaseColumn({
  projectId,
  fase,
  features,
  onCreateFeature,
  onUpdateFeature,
  onUpdateFase,
  onDeleteFase,
  onFeatureClick
}: FaseColumnProps) {
  const completed = useMemo(() => features.filter((feature) => feature.estado === "lista").length, [features]);
  const total = features.length;
  const [isExpanded, setIsExpanded] = useState(() => features.some((feature) => feature.estado !== "pendiente"));
  const [quickAdd, setQuickAdd] = useState(false);
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [draftNombre, setDraftNombre] = useState(fase.nombre);
  const [draftInicio, setDraftInicio] = useState(formatDateInput(fase.fecha_estimada_inicio));
  const [draftFin, setDraftFin] = useState(formatDateInput(fase.fecha_estimada_fin));
  const [draftDescripcion, setDraftDescripcion] = useState(fase.descripcion ?? "");
  const [menuOpen, setMenuOpen] = useState(false);
  const [savingHeader, setSavingHeader] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setDraftNombre(fase.nombre);
    setDraftInicio(formatDateInput(fase.fecha_estimada_inicio));
    setDraftFin(formatDateInput(fase.fecha_estimada_fin));
    setDraftDescripcion(fase.descripcion ?? "");
  }, [fase]);

  async function saveHeader(next?: Partial<UpdateFaseProyectoInput>) {
    setSavingHeader(true);
    try {
      await onUpdateFase(fase.id, {
        nombre: draftNombre.trim(),
        fecha_estimada_inicio: draftInicio || null,
        fecha_estimada_fin: draftFin || null,
        descripcion: draftDescripcion.trim() || null,
        ...next
      });
      setIsEditingHeader(false);
    } finally {
      setSavingHeader(false);
    }
  }

  return (
    <section className="flex min-w-[320px] max-w-[320px] flex-col rounded-card bg-paper p-3">
      <div className="space-y-3 rounded-card bg-white p-4 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            className="flex min-w-0 flex-1 items-start gap-2 text-left"
          >
            <span className="mt-1 text-sm text-graphite">{isExpanded ? "▾" : "▸"}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {isEditingHeader ? (
                  <Input
                    value={draftNombre}
                    onChange={(event) => setDraftNombre(event.target.value)}
                    onBlur={() => {
                      void saveHeader();
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        event.currentTarget.blur();
                      }
                    }}
                    className="h-9"
                  />
                ) : (
                  <span
                    className="text-base font-label text-carbon"
                    onDoubleClick={() => setIsEditingHeader(true)}
                    title="Doble click para editar"
                  >
                    {fase.nombre}
                  </span>
                )}
                <span className="text-xs text-graphite">
                  {completed}/{total} completadas
                </span>
              </div>

              <div className="mt-1 flex flex-wrap gap-2 text-xs text-graphite">
                {isEditingHeader ? (
                  <>
                    <Input
                      type="date"
                      value={draftInicio}
                      onChange={(event) => setDraftInicio(event.target.value)}
                      onBlur={() => {
                        void saveHeader();
                      }}
                      className="h-8 w-auto min-w-[135px]"
                    />
                    <Input
                      type="date"
                      value={draftFin}
                      onChange={(event) => setDraftFin(event.target.value)}
                      onBlur={() => {
                        void saveHeader();
                      }}
                      className="h-8 w-auto min-w-[135px]"
                    />
                  </>
                ) : (
                  <>
                    <span>
                      {fase.fecha_estimada_inicio ? fase.fecha_estimada_inicio.slice(0, 10) : "Sin inicio"}
                    </span>
                    <span>·</span>
                    <span>
                      {fase.fecha_estimada_fin ? fase.fecha_estimada_fin.slice(0, 10) : "Sin fin"}
                    </span>
                  </>
                )}
              </div>
            </div>
          </button>

          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 px-0 py-0"
              onClick={() => setMenuOpen((current) => !current)}
            >
              ⋮
            </Button>

            {menuOpen ? (
              <div className="absolute right-0 top-full z-20 mt-2 w-44 rounded-card border border-line bg-white p-2 shadow-modal">
                <button
                  type="button"
                  className="w-full rounded-component px-3 py-2 text-left text-sm text-carbon transition-colors duration-fast ease-fast hover:bg-paper"
                  onClick={() => {
                    setMenuOpen(false);
                    setIsEditingHeader(true);
                  }}
                >
                  Editar fase
                </button>
                <button
                  type="button"
                  className="w-full rounded-component px-3 py-2 text-left text-sm text-danger transition-colors duration-fast ease-fast hover:bg-danger-light"
                  onClick={async () => {
                    const confirmed = window.confirm(
                      "¿Eliminar esta fase? Las subtareas quedarán sin fase."
                    );
                    if (!confirmed) {
                      return;
                    }

                    setDeleting(true);
                    try {
                      await onDeleteFase(fase.id);
                    } finally {
                      setDeleting(false);
                    }
                  }}
                  disabled={deleting}
                >
                  {deleting ? "Eliminando..." : "Eliminar fase"}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="h-2 rounded-pill bg-paper">
          <div
            className="h-2 rounded-pill bg-signal transition-all duration-normal ease-normal"
            style={{ width: `${total > 0 ? Math.round((completed / total) * 100) : 0}%` }}
          />
        </div>

        {isEditingHeader ? (
          <div className="space-y-3 rounded-card border border-line-soft bg-paper p-3">
            <div className="space-y-1">
              <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">Descripción</p>
              <textarea
                value={draftDescripcion}
                onChange={(event) => setDraftDescripcion(event.target.value)}
                className="min-h-[70px] w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsEditingHeader(false);
                  setDraftNombre(fase.nombre);
                  setDraftInicio(formatDateInput(fase.fecha_estimada_inicio));
                  setDraftFin(formatDateInput(fase.fecha_estimada_fin));
                  setDraftDescripcion(fase.descripcion ?? "");
                }}
              >
                Cancelar
              </Button>
              <Button size="sm" loading={savingHeader} onClick={() => void saveHeader()}>
                Guardar
              </Button>
            </div>
          </div>
        ) : null}

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
                onEstadoChange={async (estado) => {
                  await onUpdateFeature(feature.id, { estado });
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
                    ...input
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
