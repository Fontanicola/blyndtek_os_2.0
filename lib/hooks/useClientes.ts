"use client";

import { useCallback, useEffect, useState } from "react";
import type { Cliente, CreateClienteInput, EstadoCliente, UpdateClienteInput } from "@/types/clientes";

type ClientesResponse<T> = {
  data?: T;
  error?: string;
};

type ClienteFilters = {
  estado?: EstadoCliente;
};

function buildQueryString(filters?: ClienteFilters) {
  const searchParams = new URLSearchParams();

  if (filters?.estado) {
    searchParams.set("estado", filters.estado);
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export function useClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClientes = useCallback(async (filters?: ClienteFilters) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/clientes${buildQueryString(filters)}`);
      const payload = (await response.json()) as ClientesResponse<Cliente[]>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudieron cargar los clientes.");
      }

      setClientes(payload.data);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error ? fetchError.message : "No se pudieron cargar los clientes."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCliente = useCallback(async (id: string) => {
    const response = await fetch(`/api/clientes/${id}`);
    const payload = (await response.json()) as ClientesResponse<Cliente>;

    if (!response.ok || !payload.data) {
      throw new Error(payload.error ?? "No se pudo cargar el cliente.");
    }

    return payload.data;
  }, []);

  const createCliente = useCallback(async (input: CreateClienteInput) => {
    setError(null);

    const response = await fetch("/api/clientes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });
    const payload = (await response.json()) as ClientesResponse<Cliente>;

    if (!response.ok || !payload.data) {
      const message = payload.error ?? "No se pudo crear el cliente.";
      setError(message);
      throw new Error(message);
    }

    setClientes((current) => {
      const next = [...current, payload.data as Cliente];
      return next.sort((first, second) => first.empresa.localeCompare(second.empresa));
    });

    return payload.data;
  }, []);

  const updateCliente = useCallback(async (id: string, input: UpdateClienteInput) => {
    setError(null);

    const response = await fetch(`/api/clientes/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });
    const payload = (await response.json()) as ClientesResponse<Cliente>;

    if (!response.ok || !payload.data) {
      const message = payload.error ?? "No se pudo actualizar el cliente.";
      setError(message);
      throw new Error(message);
    }

    setClientes((current) =>
      current.map((cliente) => (cliente.id === id ? (payload.data as Cliente) : cliente))
    );

    return payload.data;
  }, []);

  useEffect(() => {
    void fetchClientes({ estado: "activo" });
  }, [fetchClientes]);

  return {
    clientes,
    loading,
    error,
    fetchClientes,
    fetchCliente,
    createCliente,
    updateCliente
  };
}
