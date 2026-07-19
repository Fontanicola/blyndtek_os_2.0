"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";
import {
  createPieza,
  deletePieza,
  fetchPiezas,
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

  async function handleUpload(id: string, file: File) {
    const saved = await subirImagenPieza(id, file);
    setSelectedPieza(saved);
    await loadPiezas();
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
      ) : visiblePiezas.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visiblePiezas.map((pieza) => (
            <PiezaCard key={pieza.id} pieza={pieza} onEdit={setSelectedPieza} onDelete={(item) => void handleDelete(item)} />
          ))}
        </div>
      ) : (
        <div className="rounded-card bg-paper p-8 text-center text-graphite">
          Todavía no hay piezas en este estado.
        </div>
      )}

      <PiezaEditorModal
        isOpen={Boolean(selectedPieza)}
        pieza={selectedPieza}
        pilares={pilares}
        onClose={() => setSelectedPieza(null)}
        onSave={handleSave}
        onUploadImage={handleUpload}
      />
    </Card>
  );
}
