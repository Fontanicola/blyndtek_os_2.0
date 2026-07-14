"use client";

import { useCallback, useState } from "react";
import type { Carpeta, CarpetaContenido, CarpetaConConteos, Seccion } from "@/types/archivos";

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

type CreateCarpetaInput = {
  nombre: string;
  seccion: Seccion;
  carpeta_padre_id?: string | null;
};

type UpdateCarpetaInput = Partial<Pick<Carpeta, "nombre">>;

type MoveCarpetaInput = {
  nueva_carpeta_padre_id?: string | null;
};

type CarpetaCompartida = Carpeta;

export function useCarpetas() {
  const [carpetas, setCarpetas] = useState<CarpetaConConteos[]>([]);
  const [carpeta, setCarpeta] = useState<CarpetaContenido | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCarpetas = useCallback(async (seccion: Seccion, carpetaPadreId?: string | null) => {
    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams({ seccion });

      if (carpetaPadreId) {
        searchParams.set("carpeta_padre_id", carpetaPadreId);
      }

      const response = await fetch(`/api/carpetas?${searchParams.toString()}`);
      const payload = (await response.json()) as ApiResponse<CarpetaConConteos[]>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudieron cargar las carpetas.");
      }

      setCarpetas(payload.data);
      return payload.data;
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "No se pudieron cargar las carpetas.";
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCarpeta = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/carpetas/${id}`);
      const payload = (await response.json()) as ApiResponse<CarpetaContenido>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo cargar la carpeta.");
      }

      setCarpeta(payload.data);
      return payload.data;
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "No se pudo cargar la carpeta.";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCarpetasCompartidas = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/carpetas/compartidas");
      const payload = (await response.json()) as ApiResponse<CarpetaCompartida[]>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudieron cargar las carpetas compartidas.");
      }

      return payload.data;
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : "No se pudieron cargar las carpetas compartidas.";
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createCarpeta = useCallback(async (input: CreateCarpetaInput) => {
    setError(null);

    const response = await fetch("/api/carpetas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });
    const payload = (await response.json()) as ApiResponse<Carpeta>;

    if (!response.ok || !payload.data) {
      const message = payload.error ?? "No se pudo crear la carpeta.";
      setError(message);
      throw new Error(message);
    }

    return payload.data;
  }, []);

  const renombrarCarpeta = useCallback(async (id: string, input: UpdateCarpetaInput) => {
    setError(null);

    const response = await fetch(`/api/carpetas/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });
    const payload = (await response.json()) as ApiResponse<Carpeta>;

    if (!response.ok || !payload.data) {
      const message = payload.error ?? "No se pudo renombrar la carpeta.";
      setError(message);
      throw new Error(message);
    }

    return payload.data;
  }, []);

  const eliminarCarpeta = useCallback(async (id: string) => {
    setError(null);

    const response = await fetch(`/api/carpetas/${id}`, {
      method: "DELETE"
    });
    const payload = (await response.json()) as { success?: boolean; error?: string };

    if (!response.ok || !payload.success) {
      const message = payload.error ?? "No se pudo eliminar la carpeta.";
      setError(message);
      throw new Error(message);
    }
  }, []);

  const moverCarpeta = useCallback(async (id: string, input: MoveCarpetaInput) => {
    setError(null);

    const response = await fetch(`/api/carpetas/${id}/mover`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });
    const payload = (await response.json()) as ApiResponse<Carpeta>;

    if (!response.ok || !payload.data) {
      const message = payload.error ?? "No se pudo mover la carpeta.";
      setError(message);
      throw new Error(message);
    }

    return payload.data;
  }, []);

  return {
    carpetas,
    carpeta,
    loading,
    error,
    fetchCarpetas,
    fetchCarpetasCompartidas,
    fetchCarpeta,
    createCarpeta,
    renombrarCarpeta,
    eliminarCarpeta,
    moverCarpeta
  };
}
