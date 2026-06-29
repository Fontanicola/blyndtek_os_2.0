"use client";

import { useCallback, useEffect, useState } from "react";
import type { CreateProyectoInput, Proyecto, UpdateProyectoInput } from "@/types/proyectos";

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

type ProyectoFilters = {
  estado?: Proyecto["estado"];
  cliente_id?: string;
};

function buildQueryString(filters?: ProyectoFilters) {
  const searchParams = new URLSearchParams();

  if (filters?.estado) {
    searchParams.set("estado", filters.estado);
  }

  if (filters?.cliente_id) {
    searchParams.set("cliente_id", filters.cliente_id);
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export function useProyectos() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProyectos = useCallback(async (filters?: ProyectoFilters) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/proyectos${buildQueryString(filters)}`);
      const payload = (await response.json()) as ApiResponse<Proyecto[]>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudieron cargar los proyectos.");
      }

      setProyectos(payload.data);
      return payload.data;
    } catch (fetchError) {
      setError(
        fetchError instanceof Error ? fetchError.message : "No se pudieron cargar los proyectos."
      );
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProyecto = useCallback(async (id: string) => {
    const response = await fetch(`/api/proyectos/${id}`);
    const payload = (await response.json()) as ApiResponse<Proyecto>;

    if (!response.ok || !payload.data) {
      throw new Error(payload.error ?? "No se pudo cargar el proyecto.");
    }

    return payload.data;
  }, []);

  const createProyecto = useCallback(async (input: CreateProyectoInput) => {
    setError(null);

    const response = await fetch("/api/proyectos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });
    const payload = (await response.json()) as ApiResponse<Proyecto>;

    if (!response.ok || !payload.data) {
      const message = payload.error ?? "No se pudo crear el proyecto.";
      setError(message);
      throw new Error(message);
    }

    setProyectos((current) => [payload.data as Proyecto, ...current]);
    return payload.data;
  }, []);

  const updateProyecto = useCallback(async (id: string, input: UpdateProyectoInput) => {
    setError(null);

    const response = await fetch(`/api/proyectos/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });
    const payload = (await response.json()) as ApiResponse<Proyecto>;

    if (!response.ok || !payload.data) {
      const message = payload.error ?? "No se pudo actualizar el proyecto.";
      setError(message);
      throw new Error(message);
    }

    setProyectos((current) => current.map((item) => (item.id === id ? payload.data! : item)));
    return payload.data;
  }, []);

  const deleteProyecto = useCallback(async (id: string) => {
    setError(null);

    const response = await fetch(`/api/proyectos/${id}`, {
      method: "DELETE"
    });
    const payload = (await response.json()) as { success?: boolean; error?: string };

    if (!response.ok || !payload.success) {
      const message = payload.error ?? "No se pudo eliminar el proyecto.";
      setError(message);
      throw new Error(message);
    }

    setProyectos((current) => current.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    void fetchProyectos();
  }, [fetchProyectos]);

  return {
    proyectos,
    loading,
    error,
    setProyectos,
    fetchProyectos,
    fetchProyecto,
    createProyecto,
    updateProyecto,
    deleteProyecto
  };
}
