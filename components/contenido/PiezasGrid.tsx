"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { ChevronDownIcon, ImageIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import {
  createPieza,
  deletePieza,
  fetchPiezas,
  generarCompletoPieza,
  subirImagenPieza,
  updatePieza
} from "@/lib/hooks/useContenido";
import type { PiezaContenido, PiezaContenidoEstado, PilarContenido } from "@/types/contenido";
import { PiezaCard } from "@/components/contenido/PiezaCard";
import { PiezaEditorModal } from "@/components/contenido/PiezaEditorModal";
import { PIEZA_ESTADO_LABELS } from "@/components/contenido/contenidoStyles";

type PiezasGridProps = {
  pilares: PilarContenido[];
};

const FILTERS: Array<PiezaContenidoEstado | "todas"> = [
  "todas",
  "idea",
  "en_diseno",
  "lista",
  "programada",
  "publicada"
];

export function PiezasGrid({ pilares }: PiezasGridProps) {
  const [activeFilter, setActiveFilter] = useState<PiezaContenidoEstado | "todas">("todas");
  const [piezas, setPiezas] = useState<PiezaContenido[]>([]);
  const [selectedPieza, setSelectedPieza] = useState<PiezaContenido | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadPiezas = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPiezas();
      setPiezas(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPiezas();
  }, [loadPiezas]);

  const piecesCountByState = useMemo(() => {
    return piezas.reduce<Record<string, number>>((acc, pieza) => {
      acc[pieza.estado] = (acc[pieza.estado] ?? 0) + 1;
      return acc;
    }, {});
  }, [piezas]);

  const visiblePiezas = useMemo(() => {
    if (activeFilter === "todas") {
      return piezas;
    }

    return piezas.filter((pieza) => pieza.estado === activeFilter);
  }, [activeFilter, piezas]);

  const groupedPiezas = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        label: string;
        sortValue: string;
        piezas: PiezaContenido[];
      }
    >();

    for (const pieza of visiblePiezas) {
      const key = pieza.plan_semanal_id ?? "sin-plan";
      const sortValue = pieza.plan?.semana_inicio ?? pieza.created_at;
      const existing = groups.get(key);
      if (existing) {
        existing.piezas.push(pieza);
      } else {
        groups.set(key, {
          key,
          label: pieza.plan?.semana_inicio ? getWeekLabel(pieza.plan.semana_inicio) : "Piezas sueltas",
          sortValue,
          piezas: [pieza]
        });
      }
    }

    return Array.from(groups.values()).sort((a, b) => b.sortValue.localeCompare(a.sortValue));
  }, [visiblePiezas]);

  useEffect(() => {
    if (groupedPiezas.length === 0) {
      return;
    }

    setExpandedGroups((current) => {
      const next = { ...current };
      for (const [index, group] of groupedPiezas.entries()) {
        if (!(group.key in next)) {
          next[group.key] = index === 0;
        }
      }
      return next;
    });
  }, [groupedPiezas]);

  async function handleCreate() {
    setCreating(true);
    try {
      const pieza = await createPieza({ titulo: "Nueva pieza" });
      setSelectedPieza(pieza);
      await loadPiezas();
    } finally {
      setCreating(false);
    }
  }

  async function handleSave(id: string, payload: Partial<PiezaContenido>) {
    const saved = await updatePieza(id, payload);
    setSelectedPieza(saved);
    await loadPiezas();
  }

  async function handleUpload(id: string, file: File, slideIndex?: number | null) {
    const saved = await subirImagenPieza(id, file, slideIndex);
    setSelectedPieza(saved);
    await loadPiezas();
  }

  async function handleGenerateComplete(id: string) {
    setActionLoadingId(id);
    try {
      const result = await generarCompletoPieza(id);
      setSelectedPieza(result.pieza);
      await loadPiezas();
      return result;
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleGenerateFromCard(pieza: PiezaContenido) {
    await handleGenerateComplete(pieza.id);
  }

  async function handleApproveFromCard(pieza: PiezaContenido) {
    setActionLoadingId(pieza.id);
    try {
      const saved = await updatePieza(pieza.id, { estado: "lista" });
      if (selectedPieza?.id === pieza.id) {
        setSelectedPieza(saved);
      }
      await loadPiezas();
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleRegenerateFromCard(pieza: PiezaContenido) {
    await handleGenerateComplete(pieza.id);
  }

  async function handleGenerateCompleteForModal(id: string) {
    const result = await generarCompletoPieza(id);
    setSelectedPieza(result.pieza);
    await loadPiezas();
    return result;
  }

  async function handleDelete(pieza: PiezaContenido) {
    await deletePieza(pieza.id);
    if (selectedPieza?.id === pieza.id) {
      setSelectedPieza(null);
    }
    await loadPiezas();
  }

  return (
    <Card className="space-y-5" padding="lg">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-title text-2xl text-carbon">Piezas</h2>
          <p className="mt-1 text-sm text-graphite">Ideas, diseños y publicaciones manuales de Blyndtek.</p>
        </div>
        <Button onClick={() => void handleCreate()} loading={creating}>
          + Nueva pieza
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const active = activeFilter === filter;
          const label = filter === "todas" ? "Todas" : PIEZA_ESTADO_LABELS[filter];
          const count = filter === "todas" ? piezas.length : piecesCountByState[filter] ?? 0;

          return (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "rounded-pill px-4 py-2 text-sm font-label transition-colors duration-fast ease-fast",
                active ? "bg-signal-light text-signal" : "text-graphite hover:bg-paper hover:text-carbon"
              )}
            >
              {label} · {count}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex min-h-[220px] items-center justify-center">
          <Spinner />
        </div>
      ) : groupedPiezas.length > 0 ? (
        <div className="space-y-4">
          {groupedPiezas.map((group) => {
            const expanded = expandedGroups[group.key] ?? false;

            return (
              <section key={group.key} className="overflow-hidden rounded-card border border-line-soft bg-white">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedGroups((current) => ({
                      ...current,
                      [group.key]: !(current[group.key] ?? false)
                    }))
                  }
                  className="flex w-full items-center justify-between gap-4 border-b border-line-soft px-4 py-3 text-left transition-colors duration-fast ease-fast hover:bg-paper"
                >
                  <span>
                    <span className="block font-title text-base text-carbon">{group.label}</span>
                    <span className="mt-0.5 block text-xs text-graphite">
                      {group.piezas.length} pieza{group.piezas.length === 1 ? "" : "s"}
                    </span>
                  </span>
                  <ChevronDownIcon
                    className={cn(
                      "h-4 w-4 text-graphite transition-transform duration-fast ease-fast",
                      expanded ? "rotate-180" : "rotate-0"
                    )}
                  />
                </button>

                {expanded ? (
                  <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {group.piezas.map((pieza) => (
                      <PiezaCard
                        key={pieza.id}
                        pieza={pieza}
                        onEdit={setSelectedPieza}
                        onDelete={(item) => void handleDelete(item)}
                        onGenerate={(item) => void handleGenerateFromCard(item)}
                        onApprove={(item) => void handleApproveFromCard(item)}
                        onRegenerate={(item) => void handleRegenerateFromCard(item)}
                        actionLoading={actionLoadingId === pieza.id}
                      />
                    ))}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={ImageIcon}
          titulo="Todavía no hay piezas en este estado"
          descripcion="Creá una pieza nueva o cambiá el filtro para ver otros estados del flujo."
          accion={{ label: "Nueva pieza", onClick: () => void handleCreate() }}
        />
      )}

      <PiezaEditorModal
        isOpen={Boolean(selectedPieza)}
        pieza={selectedPieza}
        pilares={pilares}
        onClose={() => setSelectedPieza(null)}
        onSave={handleSave}
        onUploadImage={handleUpload}
        onGenerateComplete={handleGenerateCompleteForModal}
      />
    </Card>
  );
}

function getWeekLabel(dateInput: string) {
  const [year = 0, month = 1, day = 1] = dateInput.split("-").map(Number);
  if (!year || !month || !day) {
    return "Semana sin fecha";
  }

  const date = new Date(year, month - 1, day);
  const monthLabel = date.toLocaleDateString("es-AR", { month: "long" });
  const weekNumber = Math.floor((day - 1) / 7) + 1;

  return `${capitalize(monthLabel)} Semana ${weekNumber}`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
