"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Spinner } from "@/components/ui";
import { useClientes } from "@/lib/hooks/useClientes";
import { useProductos } from "@/lib/hooks/useProductos";
import type { DashboardPeriod } from "@/types/dashboard";
import type { Suscripcion } from "@/types/suscripciones";
import { MRRChart } from "./MRRChart";
import { ProductoMetricas } from "./ProductoMetricas";
import { ProductoPlanesModal } from "./ProductoPlanesModal";
import { ProductoSelector } from "./ProductoSelector";
import { RoadmapProductoKanban } from "./RoadmapProductoKanban";
import { SuscriptoresProducto } from "./SuscriptoresProducto";

type PeriodOption = {
  value: DashboardPeriod;
  label: string;
};

const periodOptions: PeriodOption[] = [
  { value: "month", label: "Este mes" },
  { value: "quarter", label: "Último trimestre" },
  { value: "year", label: "Este año" }
];

function SaasSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-12 w-full rounded-pill bg-paper animate-pulse" />
      <div className="grid gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-[118px] rounded-card bg-paper animate-pulse" />
        ))}
      </div>
      <div className="h-[340px] rounded-card bg-paper animate-pulse" />
      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="h-[820px] rounded-card bg-paper animate-pulse" />
        <div className="h-[820px] rounded-card bg-paper animate-pulse" />
      </div>
    </div>
  );
}

export function SaasClient() {
  const {
    productos,
    metricas,
    features,
    loadingProductos,
    loadingMetricas,
    loadingFeatures,
    error,
    fetchMetricasProducto,
    fetchFeaturesProducto,
    createFeature,
    updateFeature,
    updateEstadoFeature,
    deleteFeature
  } = useProductos();
  const { clientes } = useClientes();
  const [selectedProductoId, setSelectedProductoId] = useState<string | null>(null);
  const [period, setPeriod] = useState<DashboardPeriod>("month");
  const [suscripciones, setSuscripciones] = useState<Suscripcion[]>([]);
  const [loadingSuscripciones, setLoadingSuscripciones] = useState(false);
  const [suscripcionesError, setSuscripcionesError] = useState<string | null>(null);
  const [planesModalOpen, setPlanesModalOpen] = useState(false);

  useEffect(() => {
    if (!productos.length) {
      return;
    }

    if (!selectedProductoId || !productos.some((producto) => producto.id === selectedProductoId)) {
      const firstProducto = productos[0];
      if (firstProducto) {
        setSelectedProductoId(firstProducto.id);
      }
    }
  }, [productos, selectedProductoId]);

  useEffect(() => {
    if (!selectedProductoId) {
      return;
    }

    let cancelled = false;

    async function loadSuscripciones() {
      setLoadingSuscripciones(true);
      setSuscripcionesError(null);
      setSuscripciones([]);

      try {
        const response = await fetch(`/api/suscripciones?producto_id=${selectedProductoId}`);
        const payload = (await response.json()) as { data?: Suscripcion[]; error?: string };

        if (!response.ok || !payload.data) {
          throw new Error(payload.error ?? "No se pudieron cargar los suscriptores.");
        }

        if (!cancelled) {
          setSuscripciones(payload.data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setSuscripcionesError(
            loadError instanceof Error ? loadError.message : "No se pudieron cargar los suscriptores."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingSuscripciones(false);
        }
      }
    }

    void Promise.all([
      fetchMetricasProducto(selectedProductoId, period),
      fetchFeaturesProducto(selectedProductoId),
      loadSuscripciones()
    ]);

    return () => {
      cancelled = true;
    };
  }, [fetchFeaturesProducto, fetchMetricasProducto, period, selectedProductoId]);

  const selectedProducto = useMemo(
    () => productos.find((producto) => producto.id === selectedProductoId) ?? null,
    [productos, selectedProductoId]
  );

  if (loadingProductos && !productos.length) {
    return <SaasSkeleton />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-pill bg-white p-1 shadow-soft">
          {periodOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPeriod(option.value)}
              className={
                period === option.value
                  ? "rounded-pill bg-signal px-4 py-2 text-sm font-label text-white"
                  : "rounded-pill px-4 py-2 text-sm font-label text-graphite transition-colors duration-fast ease-fast hover:text-carbon"
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <Card padding="md" className="border border-danger/20 bg-danger-light">
          <p className="text-sm text-danger">{error}</p>
        </Card>
      ) : null}

      {suscripcionesError ? (
        <Card padding="md" className="border border-danger/20 bg-danger-light">
          <p className="text-sm text-danger">{suscripcionesError}</p>
        </Card>
      ) : null}

      <ProductoSelector
        productos={productos}
        selectedProductoId={selectedProductoId}
        onSelect={setSelectedProductoId}
        loading={loadingProductos}
      />

      {selectedProducto ? (
        <>
          <div className="flex justify-end">
            <Button variant="secondary" size="sm" onClick={() => setPlanesModalOpen(true)}>
              Gestionar planes
            </Button>
          </div>

          <ProductoMetricas metricas={metricas} loading={loadingMetricas} />

          <MRRChart data={metricas?.historico_mrr ?? []} loading={loadingMetricas} />

          <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
            <div className="space-y-4">
              {loadingFeatures && !features.length ? (
                <Card padding="md" className="space-y-3">
                  <div className="h-4 w-48 rounded-pill bg-paper animate-pulse" />
                  <div className="h-[560px] rounded-card bg-paper animate-pulse" />
                </Card>
              ) : (
                <RoadmapProductoKanban
                  key={selectedProducto.id}
                  productoId={selectedProducto.id}
                  features={features}
                  clientes={clientes}
                  onCreateFeature={createFeature}
                  onUpdateFeature={updateFeature}
                  onUpdateEstadoFeature={updateEstadoFeature}
                  onDeleteFeature={deleteFeature}
                />
              )}
            </div>

          <div className="space-y-4">
              {loadingSuscripciones ? (
                <Card padding="md" className="space-y-3">
                  <div className="h-4 w-48 rounded-pill bg-paper animate-pulse" />
                  <div className="h-24 rounded-card bg-paper animate-pulse" />
                  <div className="h-24 rounded-card bg-paper animate-pulse" />
                </Card>
              ) : (
                <SuscriptoresProducto suscripciones={suscripciones} clientes={clientes} />
              )}
            </div>
          </div>
        </>
      ) : (
        <Card padding="md">
          <div className="flex items-center gap-3 text-sm text-graphite">
            <Spinner />
            <span>Seleccioná un producto para ver sus métricas.</span>
          </div>
        </Card>
      )}

      <ProductoPlanesModal
        isOpen={planesModalOpen}
        onClose={() => setPlanesModalOpen(false)}
        producto={selectedProducto ? { id: selectedProducto.id, nombre: selectedProducto.nombre } : null}
      />
    </div>
  );
}
