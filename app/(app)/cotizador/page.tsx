"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CotizacionCard } from "@/components/cotizador";
import { Button, Card } from "@/components/ui";
import { createCotizacionDraft } from "@/lib/cotizaciones";
import { useCotizaciones } from "@/lib/hooks/useCotizaciones";
import type { EstadoCotizacion } from "@/types/cotizaciones";

type EstadoFiltro = EstadoCotizacion | "todas";

const estadoTabs: Array<{ value: EstadoFiltro; label: string }> = [
  { value: "todas", label: "Todas" },
  { value: "borrador", label: "Borrador" },
  { value: "enviada", label: "Enviada" },
  { value: "aceptada", label: "Aceptada" },
  { value: "rechazada", label: "Rechazada" }
];

export default function CotizadorPage() {
  const router = useRouter();
  const { cotizaciones, loading, error, fetchCotizaciones, createCotizacion } = useCotizaciones();
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("todas");

  useEffect(() => {
    void fetchCotizaciones(estadoFiltro === "todas" ? undefined : { estado: estadoFiltro });
  }, [estadoFiltro, fetchCotizaciones]);

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-title text-carbon">Cotizador</h1>
        <Button
          onClick={async () => {
            const cotizacion = await createCotizacion(
              createCotizacionDraft({ empresa: "Nueva cotización" })
            );
            router.push(`/cotizador/${cotizacion.id}`);
          }}
        >
          Nueva cotización
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {estadoTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setEstadoFiltro(tab.value)}
            className={[
              "rounded-pill px-3 py-1.5 text-sm font-label transition-colors duration-fast ease-fast",
              estadoFiltro === tab.value
                ? "bg-signal-light text-signal"
                : "bg-white text-graphite hover:text-carbon"
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-card border border-danger bg-danger-light px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {loading && cotizaciones.length === 0 ? (
        <div className="text-sm text-graphite">Cargando cotizaciones...</div>
      ) : null}

      {!loading && cotizaciones.length === 0 ? (
        <Card padding="lg" className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-graphite">No hay cotizaciones todavía</p>
          <Button
            onClick={async () => {
              const cotizacion = await createCotizacion(
                createCotizacionDraft({ empresa: "Nueva cotización" })
              );
              router.push(`/cotizador/${cotizacion.id}`);
            }}
          >
            Nueva cotización
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {cotizaciones.map((cotizacion) => (
            <CotizacionCard
              key={cotizacion.id}
              cotizacion={cotizacion}
              onClick={() => router.push(`/cotizador/${cotizacion.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
