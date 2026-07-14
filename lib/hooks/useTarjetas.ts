"use client";

import { useCallback, useEffect, useState } from "react";
import type { CreateTarjetaInput, Tarjeta, UpdateTarjetaInput } from "@/types/tarjetas";

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

type DeleteResponse = {
  success?: boolean;
  error?: string;
};

export function useTarjetas() {
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTarjetas = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/tarjetas");
      const payload = (await response.json()) as ApiResponse<Tarjeta[]>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudieron cargar las tarjetas.");
      }

      setTarjetas(payload.data);
      return payload.data;
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "No se pudieron cargar las tarjetas.";
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createTarjeta = useCallback(async (input: CreateTarjetaInput) => {
    setError(null);

    const response = await fetch("/api/tarjetas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });
    const payload = (await response.json()) as ApiResponse<Tarjeta>;

    if (!response.ok || !payload.data) {
      const message = payload.error ?? "No se pudo crear la tarjeta.";
      setError(message);
      throw new Error(message);
    }

    setTarjetas((current) => [payload.data as Tarjeta, ...current]);
    return payload.data;
  }, []);

  const updateTarjeta = useCallback(async (id: string, input: UpdateTarjetaInput) => {
    setError(null);

    const response = await fetch(`/api/tarjetas/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });
    const payload = (await response.json()) as ApiResponse<Tarjeta>;

    if (!response.ok || !payload.data) {
      const message = payload.error ?? "No se pudo actualizar la tarjeta.";
      setError(message);
      throw new Error(message);
    }

    setTarjetas((current) => current.map((item) => (item.id === id ? (payload.data as Tarjeta) : item)));
    return payload.data;
  }, []);

  const deleteTarjeta = useCallback(async (id: string) => {
    setError(null);

    const response = await fetch(`/api/tarjetas/${id}`, {
      method: "DELETE"
    });
    const payload = (await response.json()) as DeleteResponse;

    if (!response.ok || !payload.success) {
      const message = payload.error ?? "No se pudo eliminar la tarjeta.";
      setError(message);
      throw new Error(message);
    }

    setTarjetas((current) => current.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    void fetchTarjetas();
  }, [fetchTarjetas]);

  return {
    tarjetas,
    loading,
    error,
    fetchTarjetas,
    createTarjeta,
    updateTarjeta,
    deleteTarjeta
  };
}
