"use client";

import { useCallback, useEffect, useState } from "react";
import type { CreateEventoInput, Evento, TipoEvento, UpdateEventoInput } from "@/types/eventos";

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

type ApiDeleteResponse = {
  success?: boolean;
  error?: string;
};

type EventoFilters = {
  desde?: string;
  hasta?: string;
  tipo?: TipoEvento;
  usuario_id?: string;
};

export const EVENTOS_REFRESH_EVENT_NAME = "blyndtek:eventos:refresh";

function buildQueryString(filters?: EventoFilters) {
  const searchParams = new URLSearchParams();

  if (filters?.desde) {
    searchParams.set("desde", filters.desde);
  }

  if (filters?.hasta) {
    searchParams.set("hasta", filters.hasta);
  }

  if (filters?.tipo) {
    searchParams.set("tipo", filters.tipo);
  }

  if (filters?.usuario_id) {
    searchParams.set("usuario_id", filters.usuario_id);
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function sortEventos(eventos: Evento[]) {
  return [...eventos].sort((first, second) => {
    return new Date(first.fecha_inicio).getTime() - new Date(second.fecha_inicio).getTime();
  });
}

export function useEventos() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEventos = useCallback(async (filters?: EventoFilters) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/eventos${buildQueryString(filters)}`);
      const payload = await readJsonResponse<ApiResponse<Evento[]>>(response);

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudieron cargar los eventos.");
      }

      setEventos(sortEventos(payload.data));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "No se pudieron cargar los eventos.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEvento = useCallback(async (id: string) => {
    const response = await fetch(`/api/eventos/${id}`);
    const payload = await readJsonResponse<ApiResponse<Evento>>(response);

    if (!response.ok || !payload.data) {
      throw new Error(payload.error ?? "No se pudo cargar el evento.");
    }

    return payload.data;
  }, []);

  const createEvento = useCallback(async (input: CreateEventoInput) => {
    setError(null);

    const response = await fetch("/api/eventos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });
    const payload = await readJsonResponse<ApiResponse<Evento>>(response);

    if (!response.ok || !payload.data) {
      const message = payload.error ?? "No se pudo crear el evento.";
      setError(message);
      throw new Error(message);
    }

    setEventos((current) => sortEventos([payload.data as Evento, ...current]));
    window.dispatchEvent(new Event(EVENTOS_REFRESH_EVENT_NAME));
    return payload.data;
  }, []);

  const updateEvento = useCallback(async (id: string, input: UpdateEventoInput) => {
    setError(null);

    const response = await fetch(`/api/eventos/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });
    const payload = await readJsonResponse<ApiResponse<Evento>>(response);

    if (!response.ok || !payload.data) {
      const message = payload.error ?? "No se pudo actualizar el evento.";
      setError(message);
      throw new Error(message);
    }

    setEventos((current) => sortEventos(current.map((evento) => (evento.id === id ? (payload.data as Evento) : evento))));
    window.dispatchEvent(new Event(EVENTOS_REFRESH_EVENT_NAME));
    return payload.data;
  }, []);

  const deleteEvento = useCallback(async (id: string) => {
    setError(null);

    const response = await fetch(`/api/eventos/${id}`, {
      method: "DELETE"
    });
    const payload = await readJsonResponse<ApiDeleteResponse>(response);

    if (!response.ok || !payload.success) {
      const message = payload.error ?? "No se pudo eliminar el evento.";
      setError(message);
      throw new Error(message);
    }

    setEventos((current) => current.filter((evento) => evento.id !== id));
    window.dispatchEvent(new Event(EVENTOS_REFRESH_EVENT_NAME));
  }, []);

  useEffect(() => {
    void fetchEventos();
  }, [fetchEventos]);

  useEffect(() => {
    function handleRefresh() {
      void fetchEventos();
    }

    window.addEventListener(EVENTOS_REFRESH_EVENT_NAME, handleRefresh);
    return () => window.removeEventListener(EVENTOS_REFRESH_EVENT_NAME, handleRefresh);
  }, [fetchEventos]);

  return {
    eventos,
    loading,
    error,
    setEventos,
    fetchEventos,
    fetchEvento,
    createEvento,
    updateEvento,
    deleteEvento
  };
}
