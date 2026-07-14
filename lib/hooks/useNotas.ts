"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sortNotas } from "@/lib/notas";
import type { CreateNotaInput, Nota, UpdateNotaInput } from "@/types/notas";
import type { NotaEtiqueta, NotaEtiquetaColor } from "@/types/notasEtiquetas";

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

type NotaFilters = {
  carpeta_id?: string | null;
  fijadas?: boolean | null;
  papelera?: boolean | null;
  buscar?: string | null;
  cliente_id?: string | null;
  proyecto_id?: string | null;
  lead_id?: string | null;
  tag?: string | null;
};

type CreateNotaEtiquetaInput = {
  nombre: string;
  color?: NotaEtiquetaColor | null;
};

function buildQueryString(filters?: NotaFilters) {
  const searchParams = new URLSearchParams();

  Object.entries(filters ?? {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      return;
    }

    if (typeof value === "boolean") {
      searchParams.set(key, value ? "true" : "false");
      return;
    }

    searchParams.set(key, value);
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export function useNotas() {
  const [notas, setNotas] = useState<Nota[]>([]);
  const [etiquetas, setEtiquetas] = useState<NotaEtiqueta[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentFiltersRef = useRef<NotaFilters>({});
  const pendingTimerRef = useRef<Record<string, number>>({});
  const pendingPayloadRef = useRef<Record<string, UpdateNotaInput>>({});
  const inFlightRef = useRef(0);

  const syncSavingState = useCallback(() => {
    setSaving(Object.keys(pendingTimerRef.current).length > 0 || inFlightRef.current > 0);
  }, []);

  const fetchTags = useCallback(async () => {
    try {
      const response = await fetch("/api/notas-etiquetas");
      const payload = (await response.json()) as ApiResponse<NotaEtiqueta[]>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudieron cargar las etiquetas.");
      }

      setEtiquetas(payload.data);
      setTags(payload.data.map((item) => item.nombre));
      return payload.data;
    } catch {
      return [];
    }
  }, []);

  const fetchNotas = useCallback(async (filters?: NotaFilters) => {
    setLoading(true);
    setError(null);
    currentFiltersRef.current = filters ?? {};

    try {
      const response = await fetch(`/api/notas${buildQueryString(filters)}`);
      const payload = (await response.json()) as ApiResponse<Nota[]>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudieron cargar las notas.");
      }

      setNotas(sortNotas(payload.data));
      void fetchTags();
      return payload.data;
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "No se pudieron cargar las notas.";
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [fetchTags]);

  const fetchNota = useCallback(async (id: string) => {
    const response = await fetch(`/api/notas/${id}`);
    const payload = (await response.json()) as ApiResponse<Nota>;

    if (!response.ok || !payload.data) {
      throw new Error(payload.error ?? "No se pudo cargar la nota.");
    }

    return payload.data;
  }, []);

  const persistNota = useCallback(
    async (id: string, input: UpdateNotaInput) => {
      const response = await fetch(`/api/notas/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      });
      const payload = (await response.json()) as ApiResponse<Nota>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo actualizar la nota.");
      }

      setNotas((current) => current.map((item) => (item.id === id ? payload.data! : item)));
      return payload.data;
    },
    []
  );

  const updateNotaInmediata = useCallback(
    async (id: string, input: UpdateNotaInput) => {
      setError(null);

      const response = await fetch(`/api/notas/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      });
      const payload = (await response.json()) as ApiResponse<Nota>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo actualizar la nota.");
      }

      setNotas((current) => sortNotas(current.map((item) => (item.id === id ? payload.data! : item)) as Nota[]));
      await fetchNotas(currentFiltersRef.current);
      return payload.data;
    },
    [fetchNotas]
  );

  const updateNota = useCallback(
    async (id: string, input: UpdateNotaInput) => {
      setError(null);

      setNotas((current) =>
        sortNotas(
          current.map((item) =>
            item.id === id
              ? {
                  ...item,
                  ...input
                }
              : item
          ) as Nota[]
        )
      );

      pendingPayloadRef.current[id] = {
        ...(pendingPayloadRef.current[id] ?? {}),
        ...input
      };

      if (pendingTimerRef.current[id]) {
        window.clearTimeout(pendingTimerRef.current[id]);
      }

      syncSavingState();

      pendingTimerRef.current[id] = window.setTimeout(() => {
        const payload = pendingPayloadRef.current[id] ?? {};
        delete pendingPayloadRef.current[id];
        delete pendingTimerRef.current[id];
        inFlightRef.current += 1;
        syncSavingState();

        void persistNota(id, payload)
          .then(() => {
            void fetchNotas(currentFiltersRef.current);
          })
          .catch((persistError) => {
            const message =
              persistError instanceof Error ? persistError.message : "No se pudo guardar la nota.";
            setError(message);
          })
          .finally(() => {
            inFlightRef.current -= 1;
            syncSavingState();
          });
      }, 1500);
    },
    [fetchNotas, persistNota, syncSavingState]
  );

  const createNota = useCallback(
    async (input: CreateNotaInput) => {
      setError(null);

      const response = await fetch("/api/notas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      });
      const payload = (await response.json()) as ApiResponse<Nota>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo crear la nota.");
      }

      await fetchNotas(currentFiltersRef.current);
      return payload.data;
    },
    [fetchNotas]
  );

  const createEtiqueta = useCallback(
    async (input: CreateNotaEtiquetaInput) => {
      setError(null);

      const response = await fetch("/api/notas-etiquetas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      });
      const payload = (await response.json()) as ApiResponse<NotaEtiqueta>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo crear la etiqueta.");
      }

      await fetchTags();
      return payload.data;
    },
    [fetchTags]
  );

  const updateEtiquetaColor = useCallback(
    async (id: string, color: NotaEtiquetaColor) => {
      setError(null);

      const response = await fetch(`/api/notas-etiquetas/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ color })
      });
      const payload = (await response.json()) as ApiResponse<NotaEtiqueta>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo actualizar la etiqueta.");
      }

      await fetchTags();
      return payload.data;
    },
    [fetchTags]
  );

  const toggleFijada = useCallback(
    async (id: string) => {
      const note = notas.find((item) => item.id === id);

      if (!note) {
        return null;
      }

      setError(null);

      const response = await fetch(`/api/notas/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ fijada: !note.fijada })
      });
      const payload = (await response.json()) as ApiResponse<Nota>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo fijar la nota.");
      }

      setNotas((current) => current.map((item) => (item.id === id ? payload.data! : item)));
      await fetchNotas(currentFiltersRef.current);
      return payload.data;
    },
    [fetchNotas, notas]
  );

  const eliminarNota = useCallback(
    async (id: string) => {
      setError(null);

      const response = await fetch(`/api/notas/${id}`, {
        method: "DELETE"
      });
      const payload = (await response.json()) as ApiResponse<Nota>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo enviar la nota a papelera.");
      }

      await fetchNotas(currentFiltersRef.current);
      return payload.data;
    },
    [fetchNotas]
  );

  const restaurarNota = useCallback(
    async (id: string) => {
      setError(null);

      const response = await fetch(`/api/notas/${id}/restaurar`, {
        method: "POST"
      });
      const payload = (await response.json()) as ApiResponse<Nota>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo restaurar la nota.");
      }

      await fetchNotas(currentFiltersRef.current);
      return payload.data;
    },
    [fetchNotas]
  );

  const eliminarDefinitivo = useCallback(
    async (id: string) => {
      setError(null);

      const response = await fetch(`/api/notas/${id}/eliminar-definitivo`, {
        method: "DELETE"
      });
      const payload = (await response.json()) as ApiResponse<null>;

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo eliminar definitivamente la nota.");
      }

      await fetchNotas(currentFiltersRef.current);
    },
    [fetchNotas]
  );

  useEffect(() => {
    void fetchNotas({ papelera: false });
  }, [fetchNotas]);

  useEffect(() => {
    const pendingTimers = pendingTimerRef.current;
    return () => {
      Object.values(pendingTimers).forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  return {
    notas,
    etiquetas,
    loading,
    saving,
    error,
    tags,
    setNotas,
    fetchNotas,
    fetchTags,
    fetchNota,
    createNota,
    createEtiqueta,
    updateEtiquetaColor,
    updateNota,
    updateNotaInmediata,
    toggleFijada,
    eliminarNota,
    restaurarNota,
    eliminarDefinitivo
  };
}
