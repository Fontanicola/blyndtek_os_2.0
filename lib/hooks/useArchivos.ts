"use client";

import { useCallback, useEffect, useState } from "react";
import type { Archivo } from "@/types/archivos";

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

type UpdateArchivoInput = Partial<Pick<Archivo, "nombre">>;

type MoveArchivoInput = {
  nueva_carpeta_id?: string | null;
};

type UploadResult = {
  archivo: Archivo | null;
  progress: number;
};

export function useArchivos() {
  const [papelera, setPapelera] = useState<Archivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPapelera = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/archivos/papelera");
      const payload = (await response.json()) as ApiResponse<Archivo[]>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo cargar la papelera.");
      }

      setPapelera(payload.data);
      return payload.data;
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "No se pudo cargar la papelera.";
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const subirArchivo = useCallback(async (file: File, carpetaId: string): Promise<UploadResult> => {
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("carpeta_id", carpetaId);

    const response = await fetch("/api/archivos/upload", {
      method: "POST",
      body: formData
    });
    const payload = (await response.json()) as ApiResponse<Archivo>;

    if (!response.ok || !payload.data) {
      const message = payload.error ?? "No se pudo subir el archivo.";
      setError(message);
      throw new Error(message);
    }

    return { archivo: payload.data, progress: 100 };
  }, []);

  const renombrarArchivo = useCallback(async (id: string, input: UpdateArchivoInput) => {
    setError(null);

    const response = await fetch(`/api/archivos/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });
    const payload = (await response.json()) as ApiResponse<Archivo>;

    if (!response.ok || !payload.data) {
      const message = payload.error ?? "No se pudo renombrar el archivo.";
      setError(message);
      throw new Error(message);
    }

    return payload.data;
  }, []);

  const eliminarArchivo = useCallback(async (id: string) => {
    setError(null);

    const response = await fetch(`/api/archivos/${id}`, {
      method: "DELETE"
    });
    const payload = (await response.json()) as { success?: boolean; error?: string };

    if (!response.ok || !payload.success) {
      const message = payload.error ?? "No se pudo mover el archivo a papelera.";
      setError(message);
      throw new Error(message);
    }
  }, []);

  const restaurarArchivo = useCallback(async (id: string) => {
    setError(null);

    const response = await fetch(`/api/archivos/${id}/restaurar`, {
      method: "POST"
    });
    const payload = (await response.json()) as ApiResponse<Archivo>;

    if (!response.ok || !payload.data) {
      const message = payload.error ?? "No se pudo restaurar el archivo.";
      setError(message);
      throw new Error(message);
    }

    return payload.data;
  }, []);

  const eliminarDefinitivo = useCallback(async (id: string) => {
    setError(null);

    const response = await fetch(`/api/archivos/${id}/eliminar-definitivo`, {
      method: "DELETE"
    });
    const payload = (await response.json()) as { success?: boolean; error?: string };

    if (!response.ok || !payload.success) {
      const message = payload.error ?? "No se pudo eliminar el archivo definitivamente.";
      setError(message);
      throw new Error(message);
    }
  }, []);

  const moverArchivo = useCallback(async (id: string, input: MoveArchivoInput) => {
    setError(null);

    const response = await fetch(`/api/archivos/${id}/mover`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });
    const payload = (await response.json()) as ApiResponse<Archivo>;

    if (!response.ok || !payload.data) {
      const message = payload.error ?? "No se pudo mover el archivo.";
      setError(message);
      throw new Error(message);
    }

    return payload.data;
  }, []);

  const descargarArchivo = useCallback((id: string, descargar = false) => {
    const query = descargar ? "?descargar=true" : "";
    window.open(`/api/archivos/${id}/descargar${query}`, "_blank", "noopener,noreferrer");
  }, []);

  useEffect(() => {
    void fetchPapelera();
  }, [fetchPapelera]);

  return {
    papelera,
    loading,
    error,
    fetchPapelera,
    subirArchivo,
    renombrarArchivo,
    eliminarArchivo,
    restaurarArchivo,
    eliminarDefinitivo,
    moverArchivo,
    descargarArchivo
  };
}
