"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DashboardPeriod } from "@/types/dashboard";
import type { Producto, ProductoFeature, ProductoMetricas, CreateProductoFeatureInput, UpdateProductoFeatureInput, EstadoFeatureProducto } from "@/types/productos";

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

type FeaturesResponse = ApiResponse<ProductoFeature[]>;
type FeatureResponse = ApiResponse<ProductoFeature>;
type ProductosResponse = ApiResponse<Producto[]>;
type MetricasResponse = ApiResponse<ProductoMetricas>;

export function useProductos() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [features, setFeatures] = useState<ProductoFeature[]>([]);
  const [metricas, setMetricas] = useState<ProductoMetricas | null>(null);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [loadingMetricas, setLoadingMetricas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeProductoIdRef = useRef<string | null>(null);
  const productsRequestIdRef = useRef(0);
  const featuresRequestIdRef = useRef(0);
  const metricasRequestIdRef = useRef(0);

  const fetchProductos = useCallback(async () => {
    const requestId = ++productsRequestIdRef.current;
    setLoadingProductos(true);
    setError(null);

    try {
      const response = await fetch("/api/productos");
      const payload = (await response.json()) as ProductosResponse;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudieron cargar los productos.");
      }

      if (requestId !== productsRequestIdRef.current) {
        return payload.data;
      }

      setProductos(payload.data);
      return payload.data;
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "No se pudieron cargar los productos.";
      if (requestId === productsRequestIdRef.current) {
        setError(message);
      }
      return [];
    } finally {
      if (requestId === productsRequestIdRef.current) {
        setLoadingProductos(false);
      }
    }
  }, []);

  const fetchMetricasProducto = useCallback(async (productoId: string, period: DashboardPeriod = "month") => {
    const requestId = ++metricasRequestIdRef.current;
    activeProductoIdRef.current = productoId;
    setLoadingMetricas(true);
    setError(null);
    setMetricas(null);

    try {
      const response = await fetch(`/api/productos/${productoId}/metricas?period=${period}`);
      const payload = (await response.json()) as MetricasResponse;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudieron cargar las métricas del producto.");
      }

      if (requestId !== metricasRequestIdRef.current || activeProductoIdRef.current !== productoId) {
        return payload.data;
      }

      setMetricas(payload.data);
      return payload.data;
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : "No se pudieron cargar las métricas del producto.";
      if (requestId === metricasRequestIdRef.current) {
        setError(message);
      }
      return null;
    } finally {
      if (requestId === metricasRequestIdRef.current) {
        setLoadingMetricas(false);
      }
    }
  }, []);

  const fetchFeaturesProducto = useCallback(async (productoId: string) => {
    const requestId = ++featuresRequestIdRef.current;
    activeProductoIdRef.current = productoId;
    setLoadingFeatures(true);
    setError(null);
    setFeatures([]);

    try {
      const response = await fetch(`/api/productos/${productoId}/features`);
      const payload = (await response.json()) as FeaturesResponse;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudieron cargar las features del producto.");
      }

      if (requestId !== featuresRequestIdRef.current || activeProductoIdRef.current !== productoId) {
        return payload.data;
      }

      setFeatures(payload.data);
      return payload.data;
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : "No se pudieron cargar las features del producto.";
      if (requestId === featuresRequestIdRef.current) {
        setError(message);
      }
      return [];
    } finally {
      if (requestId === featuresRequestIdRef.current) {
        setLoadingFeatures(false);
      }
    }
  }, []);

  const createFeature = useCallback(async (productoId: string, input: CreateProductoFeatureInput) => {
    setError(null);

    const response = await fetch(`/api/productos/${productoId}/features`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });
    const payload = (await response.json()) as FeatureResponse;

    if (!response.ok || !payload.data) {
      const message = payload.error ?? "No se pudo crear la feature.";
      setError(message);
      throw new Error(message);
    }

    setFeatures((current) => {
      const next = [...current, payload.data as ProductoFeature];
      return next.sort((left, right) => left.orden - right.orden || left.created_at.localeCompare(right.created_at));
    });

    return payload.data;
  }, []);

  const updateFeature = useCallback(async (id: string, input: UpdateProductoFeatureInput) => {
    setError(null);

    const response = await fetch(`/api/producto-features/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });
    const payload = (await response.json()) as FeatureResponse;

    if (!response.ok || !payload.data) {
      const message = payload.error ?? "No se pudo actualizar la feature.";
      setError(message);
      throw new Error(message);
    }

    setFeatures((current) =>
      current.map((feature) => (feature.id === id ? (payload.data as ProductoFeature) : feature))
    );

    return payload.data;
  }, []);

  const updateEstadoFeature = useCallback(async (id: string, estado: EstadoFeatureProducto) => {
    setError(null);

    const response = await fetch(`/api/producto-features/${id}/estado`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ estado })
    });
    const payload = (await response.json()) as FeatureResponse;

    if (!response.ok || !payload.data) {
      const message = payload.error ?? "No se pudo actualizar el estado de la feature.";
      setError(message);
      throw new Error(message);
    }

    setFeatures((current) =>
      current.map((feature) => (feature.id === id ? (payload.data as ProductoFeature) : feature))
    );

    return payload.data;
  }, []);

  const deleteFeature = useCallback(async (id: string) => {
    setError(null);

    const response = await fetch(`/api/producto-features/${id}`, {
      method: "DELETE"
    });
    const payload = (await response.json()) as { success?: boolean; error?: string };

    if (!response.ok || !payload.success) {
      const message = payload.error ?? "No se pudo eliminar la feature.";
      setError(message);
      throw new Error(message);
    }

    setFeatures((current) => current.filter((feature) => feature.id !== id));
  }, []);

  useEffect(() => {
    void fetchProductos();
  }, [fetchProductos]);

  return {
    productos,
    features,
    metricas,
    loadingProductos,
    loadingFeatures,
    loadingMetricas,
    error,
    fetchProductos,
    fetchMetricasProducto,
    fetchFeaturesProducto,
    createFeature,
    updateFeature,
    updateEstadoFeature,
    deleteFeature
  };
}
