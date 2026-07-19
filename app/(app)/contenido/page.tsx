"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";
import { fetchMarcaBlyndtek, fetchPilares } from "@/lib/hooks/useContenido";
import type { MarcaContenido, PilarContenido } from "@/types/contenido";
import { IdentidadMarcaForm } from "@/components/contenido/IdentidadMarcaForm";
import { PilaresGestion } from "@/components/contenido/PilaresGestion";
import { PiezasGrid } from "@/components/contenido/PiezasGrid";

type Tab = "identidad" | "piezas";

export default function ContenidoPage() {
  const [activeTab, setActiveTab] = useState<Tab>("identidad");
  const [marca, setMarca] = useState<MarcaContenido | null>(null);
  const [pilares, setPilares] = useState<PilarContenido[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBaseData = useCallback(async () => {
    setLoading(true);
    try {
      const [marcaData, pilaresData] = await Promise.all([fetchMarcaBlyndtek(), fetchPilares()]);
      setMarca(marcaData);
      setPilares(pilaresData);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPilares = useCallback(async () => {
    const data = await fetchPilares();
    setPilares(data);
  }, []);

  useEffect(() => {
    void loadBaseData();
  }, [loadBaseData]);

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Spinner />
      </div>
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
      <div className="flex flex-wrap gap-2 border-b border-line-soft pb-3">
        {[
          { id: "identidad", label: "Identidad" },
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

      {activeTab === "identidad" ? (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <IdentidadMarcaForm marca={marca} onSaved={setMarca} />
          <PilaresGestion pilares={pilares} onChange={() => void loadPilares()} />
        </div>
      ) : (
        <PiezasGrid pilares={pilares} />
      )}
    </div>
  );
}
