"use client";

import { useCallback, useEffect, useState } from "react";
import type { Caja } from "@/types/cajas";

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

type DeleteResponse = {
  success?: boolean;
  error?: string;
};

type CreateCajaInput = {
  nombre: string;
  color: string;
};

type UpdateCajaInput = Partial<{
  nombre: string;
  color: string;
  activa: boolean;
  orden: number;
}>;

function buildQueryString(soloActivas?: boolean) {
  if (!soloActivas) {
    return "";
  }

  return "?activa=true";
}

export function useCajas() {
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCajas = useCallback(async (soloActivas?: boolean) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/cajas${buildQueryString(soloActivas)}`);
      const payload = (await response.json()) as ApiResponse<Caja[]>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudieron cargar las cajas.");
      }

      setCajas(payload.data);
      return payload.data;
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "No se pudieron cargar las cajas.";
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createCaja = useCallback(async (input: CreateCajaInput) => {
    setError(null);

    const response = await fetch("/api/cajas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });
    const payload = (await response.json()) as ApiResponse<Caja>;

    if (!response.ok || !payload.data) {
      const message = payload.error ?? "No se pudo crear la caja.";
      setError(message);
      throw new Error(message);
    }

    setCajas((current) => {
      const next = [...current, payload.data as Caja];
      return next.sort((first, second) => first.orden - second.orden || first.nombre.localeCompare(second.nombre));
    });

    return payload.data;
  }, []);

  const updateCaja = useCallback(async (id: string, input: UpdateCajaInput) => {
    setError(null);

    const response = await fetch(`/api/cajas/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });
    const payload = (await response.json()) as ApiResponse<Caja>;

    if (!response.ok || !payload.data) {
      const message = payload.error ?? "No se pudo actualizar la caja.";
      setError(message);
      throw new Error(message);
    }

    setCajas((current) =>
      current
        .map((item) => (item.id === id ? (payload.data as Caja) : item))
        .sort((first, second) => first.orden - second.orden || first.nombre.localeCompare(second.nombre))
    );

    return payload.data;
  }, []);

  const deleteCaja = useCallback(async (id: string) => {
    setError(null);

    const response = await fetch(`/api/cajas/${id}`, {
      method: "DELETE"
    });
    const payload = (await response.json()) as DeleteResponse;

    if (!response.ok || !payload.success) {
      const message = payload.error ?? "No se pudo eliminar la caja.";
      setError(message);
      throw new Error(message);
    }

    setCajas((current) => current.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    void fetchCajas();
  }, [fetchCajas]);

  return {
    cajas,
    loading,
    error,
    fetchCajas,
    createCaja,
    updateCaja,
    deleteCaja
  };
}
