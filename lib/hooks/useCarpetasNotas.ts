"use client";

import { useCallback, useEffect, useState } from "react";
import type { CarpetaNota, CreateCarpetaNotaInput, UpdateCarpetaNotaInput } from "@/types/notas";

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

type CarpetaNotaConConteo = CarpetaNota & { cantidad_notas: number };

export function useCarpetasNotas() {
  const [carpetas, setCarpetas] = useState<CarpetaNotaConConteo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCarpetas = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/carpetas-notas");
      const payload = (await response.json()) as ApiResponse<CarpetaNotaConConteo[]>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudieron cargar las carpetas de notas.");
      }

      setCarpetas(payload.data);
      return payload.data;
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : "No se pudieron cargar las carpetas de notas.";
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createCarpeta = useCallback(async (input: CreateCarpetaNotaInput) => {
    const response = await fetch("/api/carpetas-notas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });
    const payload = (await response.json()) as ApiResponse<CarpetaNotaConConteo>;

    if (!response.ok || !payload.data) {
      throw new Error(payload.error ?? "No se pudo crear la carpeta.");
    }

    await fetchCarpetas();
    return payload.data;
  }, [fetchCarpetas]);

  const updateCarpeta = useCallback(async (id: string, input: UpdateCarpetaNotaInput) => {
    const response = await fetch(`/api/carpetas-notas/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });
    const payload = (await response.json()) as ApiResponse<CarpetaNotaConConteo>;

    if (!response.ok || !payload.data) {
      throw new Error(payload.error ?? "No se pudo actualizar la carpeta.");
    }

    setCarpetas((current) => current.map((item) => (item.id === id ? payload.data! : item)));
    return payload.data;
  }, []);

  const deleteCarpeta = useCallback(async (id: string) => {
    const response = await fetch(`/api/carpetas-notas/${id}`, {
      method: "DELETE"
    });
    const payload = (await response.json()) as ApiResponse<null>;

    if (!response.ok) {
      throw new Error(payload.error ?? "No se pudo eliminar la carpeta.");
    }

    await fetchCarpetas();
  }, [fetchCarpetas]);

  useEffect(() => {
    void fetchCarpetas();
  }, [fetchCarpetas]);

  return {
    carpetas,
    loading,
    error,
    fetchCarpetas,
    createCarpeta,
    updateCarpeta,
    deleteCarpeta
  };
}
