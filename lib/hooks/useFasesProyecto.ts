"use client";

import { useCallback, useState } from "react";
import type {
  CreateFaseProyectoInput,
  EstadoFaseProyecto,
  FaseProyecto,
  UpdateFaseProyectoInput
} from "@/types/fases-proyecto";

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

export function useFasesProyecto() {
  const [fases, setFases] = useState<FaseProyecto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFases = useCallback(async (proyectoId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/proyectos/${proyectoId}/fases`);
      const payload = (await response.json()) as ApiResponse<FaseProyecto[]>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudieron cargar las fases.");
      }

      setFases(payload.data);
      return payload.data;
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : "No se pudieron cargar las fases.";
      setError(message);
      setFases([]);
      return [] as FaseProyecto[];
    } finally {
      setLoading(false);
    }
  }, []);

  const createFase = useCallback(async (proyectoId: string, input: CreateFaseProyectoInput) => {
    setError(null);

    const response = await fetch(`/api/proyectos/${proyectoId}/fases`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });
    const payload = (await response.json()) as ApiResponse<FaseProyecto>;

    if (!response.ok || !payload.data) {
      const message = payload.error ?? "No se pudo crear la fase.";
      setError(message);
      throw new Error(message);
    }

    setFases((current) => {
      const next = [...current.filter((fase) => fase.id !== payload.data!.id), payload.data!];
      return next.sort((first, second) => first.orden - second.orden || first.nombre.localeCompare(second.nombre));
    });

    return payload.data;
  }, []);

  const updateFase = useCallback(async (id: string, input: UpdateFaseProyectoInput) => {
    setError(null);

    const response = await fetch(`/api/fases/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });
    const payload = (await response.json()) as ApiResponse<FaseProyecto>;

    if (!response.ok || !payload.data) {
      const message = payload.error ?? "No se pudo actualizar la fase.";
      setError(message);
      throw new Error(message);
    }

    setFases((current) => {
      const next = [...current.filter((fase) => fase.id !== payload.data!.id), payload.data!];
      return next.sort((first, second) => first.orden - second.orden || first.nombre.localeCompare(second.nombre));
    });

    return payload.data;
  }, []);

  const deleteFase = useCallback(async (id: string) => {
    setError(null);

    const response = await fetch(`/api/fases/${id}`, {
      method: "DELETE"
    });
    const payload = (await response.json()) as ApiResponse<{ success: boolean }>;

    if (!response.ok || !payload.data?.success) {
      const message = payload.error ?? "No se pudo eliminar la fase.";
      setError(message);
      throw new Error(message);
    }

    setFases((current) => current.filter((fase) => fase.id !== id));
    return payload.data;
  }, []);

  const updateEstadoFase = useCallback(async (id: string, estado: EstadoFaseProyecto) => {
    setError(null);

    const response = await fetch(`/api/fases/${id}/estado`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ estado })
    });
    const payload = (await response.json()) as ApiResponse<FaseProyecto>;

    if (!response.ok || !payload.data) {
      const message = payload.error ?? "No se pudo actualizar el estado de la fase.";
      setError(message);
      throw new Error(message);
    }

    setFases((current) => {
      const next = [...current.filter((fase) => fase.id !== payload.data!.id), payload.data!];
      return next.sort((first, second) => first.orden - second.orden || first.nombre.localeCompare(second.nombre));
    });

    return payload.data;
  }, []);

  return {
    fases,
    loading,
    error,
    setFases,
    fetchFases,
    createFase,
    updateFase,
    deleteFase,
    updateEstadoFase
  };
}
