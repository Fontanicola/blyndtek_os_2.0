"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { PageSkeleton } from "@/components/ui";
import { cn } from "@/lib/cn";
import { fetchMarcaBlyndtek, fetchPiezas, fetchPilares } from "@/lib/hooks/useContenido";
import type { MarcaContenido, PilarContenido } from "@/types/contenido";
import { PlanSemanalView } from "@/components/contenido/PlanSemanalView";
import { PiezasGrid } from "@/components/contenido/PiezasGrid";

type Tab = "plan" | "piezas";

export default function ContenidoPage() {
  const [activeTab, setActiveTab] = useState<Tab>("piezas");
  const [marca, setMarca] = useState<MarcaContenido | null>(null);
  const [pilares, setPilares] = useState<PilarContenido[]>([]);
  const [piezasRevisionCount, setPiezasRevisionCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadBaseData = useCallback(async () => {
    setLoading(true);
    try {
      const [marcaData, pilaresData, piezasEnRevision] = await Promise.all([
        fetchMarcaBlyndtek(),
        fetchPilares(),
        fetchPiezas({ estado: "en_diseno" })
      ]);
      setMarca(marcaData);
      setPilares(pilaresData);
      setPiezasRevisionCount(piezasEnRevision.filter((pieza) => Boolean(pieza.plan_semanal_id)).length);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBaseData();
  }, [loadBaseData]);

  if (loading) {
    return (
      <PageSkeleton rows={7} kpis={2} />
    );
  }

  if (!marca) {
    return (
      <div className="rounded-card bg-danger-light p-6 text-danger">
        No se encontró la marca Blyndtek en Content Studio.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {piezasRevisionCount > 0 ? (
        <button
          type="button"
          onClick={() => setActiveTab("piezas")}
          className="flex w-full items-center justify-between gap-4 rounded-card border border-signal/20 bg-signal-light px-5 py-4 text-left transition-colors duration-fast ease-fast hover:border-signal/40"
        >
          <span>
            <span className="block font-title text-lg text-carbon">Tu plan semanal está listo para revisar</span>
            <span className="mt-1 block text-sm text-graphite">
              {piezasRevisionCount} pieza{piezasRevisionCount === 1 ? "" : "s"} esperando tu aprobación.
            </span>
          </span>
          <span className="shrink-0 text-sm font-label text-signal">Ver piezas</span>
        </button>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-line-soft pb-3">
        {[
          { id: "plan", label: "Plan Semanal" },
          { id: "piezas", label: "Piezas" }
        ].map((tab) => (
          <Button
            key={tab.id}
            variant="ghost"
            onClick={() => setActiveTab(tab.id as Tab)}
            className={cn(
              "rounded-pill px-5",
              activeTab === tab.id ? "bg-signal-light text-signal hover:bg-signal-light hover:text-signal" : ""
            )}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {activeTab === "plan" ? (
        <PlanSemanalView />
      ) : (
        <PiezasGrid pilares={pilares} />
      )}
    </div>
  );
}
