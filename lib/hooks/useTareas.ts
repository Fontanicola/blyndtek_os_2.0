"use client";

import { useCallback, useEffect, useState } from "react";
import { sortTareas } from "@/lib/tareas";
import type { CreateTareaInput, EstadoTarea, PrioridadTarea, Tarea, UpdateTareaInput } from "@/types/tareas";

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

type ApiDeleteResponse = {
  success?: boolean;
  error?: string;
};

type TareaFilters = {
  proyecto_id?: string;
  responsable_id?: string;
  prioridad?: PrioridadTarea;
  estado?: EstadoTarea;
};

const refreshEventName = "blyndtek:tareas:refresh";

function buildQueryString(filters?: TareaFilters) {
  const searchParams = new URLSearchParams();

  if (filters?.proyecto_id) {
    searchParams.set("proyecto_id", filters.proyecto_id);
  }

  if (filters?.responsable_id) {
    searchParams.set("responsable_id", filters.responsable_id);
  }

  if (filters?.prioridad) {
    searchParams.set("prioridad", filters.prioridad);
  }

  if (filters?.estado) {
    searchParams.set("estado", filters.estado);
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export function useTareas() {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTareas = useCallback(async (filters?: TareaFilters) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tareas${buildQueryString(filters)}`);
      const payload = await readJsonResponse<ApiResponse<Tarea[]>>(response);

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudieron cargar las tareas.");
      }

      setTareas(sortTareas(payload.data));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "No se pudieron cargar las tareas.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTarea = useCallback(async (id: string) => {
    const response = await fetch(`/api/tareas/${id}`);
    const payload = await readJsonResponse<ApiResponse<Tarea>>(response);

    if (!response.ok || !payload.data) {
      throw new Error(payload.error ?? "No se pudo cargar la tarea.");
    }

    return payload.data;
  }, []);

  const createTarea = useCallback(async (input: CreateTareaInput) => {
    setError(null);

    const response = await fetch("/api/tareas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });
    const payload = await readJsonResponse<ApiResponse<Tarea>>(response);

    if (!response.ok || !payload.data) {
      const message = payload.error ?? "No se pudo crear la tarea.";
      setError(message);
      throw new Error(message);
    }

    setTareas((current) => sortTareas([payload.data as Tarea, ...current]));
    window.dispatchEvent(new Event(refreshEventName));
    return payload.data;
  }, []);

  const updateTarea = useCallback(async (id: string, input: UpdateTareaInput) => {
    setError(null);

    const response = await fetch(`/api/tareas/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });
    const payload = await readJsonResponse<ApiResponse<Tarea>>(response);

    if (!response.ok || !payload.data) {
      const message = payload.error ?? "No se pudo actualizar la tarea.";
      setError(message);
      throw new Error(message);
    }

    setTareas((current) => sortTareas(current.map((tarea) => (tarea.id === id ? (payload.data as Tarea) : tarea))));
    window.dispatchEvent(new Event(refreshEventName));
    return payload.data;
  }, []);

  const updateEstado = useCallback(async (id: string, estado: EstadoTarea) => {
    return updateTarea(id, { estado });
  }, [updateTarea]);

  const deleteTarea = useCallback(async (id: string) => {
    setError(null);

    const response = await fetch(`/api/tareas/${id}`, {
      method: "DELETE"
    });
    const payload = await readJsonResponse<ApiDeleteResponse>(response);

    if (!response.ok || !payload.success) {
      const message = payload.error ?? "No se pudo eliminar la tarea.";
      setError(message);
      throw new Error(message);
    }

    setTareas((current) => current.filter((tarea) => tarea.id !== id));
    window.dispatchEvent(new Event(refreshEventName));
  }, []);

  useEffect(() => {
    void fetchTareas();
  }, [fetchTareas]);

  useEffect(() => {
    function handleRefresh() {
      void fetchTareas();
    }

    window.addEventListener(refreshEventName, handleRefresh);
    return () => window.removeEventListener(refreshEventName, handleRefresh);
  }, [fetchTareas]);

  return {
    tareas,
    loading,
    error,
    setTareas,
    fetchTareas,
    fetchTarea,
    createTarea,
    updateTarea,
    updateEstado,
    deleteTarea
  };
}
