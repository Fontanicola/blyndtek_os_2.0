"use client";

import { useCallback, useState } from "react";
import type { CreateFeatureInput, Feature, UpdateFeatureInput } from "@/types/features";
import type { Proyecto } from "@/types/proyectos";

type ApiResponse<T> = {
  data?: T;
  project?: Proyecto | null;
  error?: string;
};

type ApiDeleteResponse = {
  success?: boolean;
  project?: Proyecto | null;
  error?: string;
};

export function useFeatures() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeatures = useCallback(async (proyectoId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/proyectos/${proyectoId}/features`);
      const payload = (await response.json()) as ApiResponse<Feature[]>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudieron cargar las features.");
      }

      setFeatures(payload.data);
      return payload.data;
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : "No se pudieron cargar las features.";
      setError(message);
      return [] as Feature[];
    } finally {
      setLoading(false);
    }
  }, []);

  const createFeature = useCallback(async (proyectoId: string, input: CreateFeatureInput) => {
    setError(null);

    const response = await fetch(`/api/proyectos/${proyectoId}/features`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });
    const payload = (await response.json()) as ApiResponse<Feature>;

    if (!response.ok || !payload.data) {
      const message = payload.error ?? "No se pudo crear la feature.";
      setError(message);
      throw new Error(message);
    }

    setFeatures((current) => [...current, payload.data as Feature]);
    return payload;
  }, []);

  const updateFeature = useCallback(async (id: string, input: UpdateFeatureInput) => {
    setError(null);

    const response = await fetch(`/api/features/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });
    const payload = (await response.json()) as ApiResponse<Feature>;

    if (!response.ok || !payload.data) {
      const message = payload.error ?? "No se pudo actualizar la feature.";
      setError(message);
      throw new Error(message);
    }

    setFeatures((current) => current.map((item) => (item.id === id ? payload.data! : item)));
    return payload;
  }, []);

  const deleteFeature = useCallback(async (id: string) => {
    setError(null);

    const response = await fetch(`/api/features/${id}`, {
      method: "DELETE"
    });
    const payload = (await response.json()) as ApiDeleteResponse;

    if (!response.ok || !payload.success) {
      const message = payload.error ?? "No se pudo eliminar la feature.";
      setError(message);
      throw new Error(message);
    }

    setFeatures((current) => current.filter((item) => item.id !== id));
    return payload;
  }, []);

  return {
    features,
    loading,
    error,
    setFeatures,
    fetchFeatures,
    createFeature,
    updateFeature,
    deleteFeature
  };
}
