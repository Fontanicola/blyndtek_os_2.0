"use client";

import { useCallback, useEffect, useState } from "react";
import { createLeadDraft, sortLeadsByUpdatedAt, type LeadFilters } from "@/lib/leads";
import type { CreateLeadInput, EtapaLead, Lead, UpdateLeadInput } from "@/types/leads";

type ApiDataResponse<T> = {
  data?: T;
  error?: string;
};

type ApiDeleteResponse = {
  success?: boolean;
  error?: string;
};

async function readJsonResponse<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function buildQueryString(filters?: LeadFilters) {
  const searchParams = new URLSearchParams({
    canal: "outbound"
  });

  if (filters?.etapa) {
    searchParams.set("etapa", filters.etapa);
  }

  if (filters?.responsable_id) {
    searchParams.set("responsable_id", filters.responsable_id);
  }

  if (filters?.rubro) {
    searchParams.set("rubro", filters.rubro);
  }

  if (filters?.ubicacion) {
    searchParams.set("ubicacion", filters.ubicacion);
  }

  return `?${searchParams.toString()}`;
}

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async (filters?: LeadFilters) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/leads${buildQueryString(filters)}`);
      const payload = await readJsonResponse<ApiDataResponse<Lead[]>>(response);

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudieron cargar los leads.");
      }

      setLeads(sortLeadsByUpdatedAt(payload.data));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "No se pudieron cargar los leads.");
    } finally {
      setLoading(false);
    }
  }, []);

  const createLead = useCallback(async (input: CreateLeadInput) => {
    setError(null);

    const payload = {
      ...createLeadDraft(input.etapa),
      ...input,
      canal: "outbound" as const
    };

    const response = await fetch("/api/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const responsePayload = await readJsonResponse<ApiDataResponse<Lead>>(response);

    if (!response.ok || !responsePayload.data) {
      const message = responsePayload.error ?? "No se pudo crear el lead.";
      setError(message);
      throw new Error(message);
    }

    setLeads((current) => sortLeadsByUpdatedAt([responsePayload.data as Lead, ...current]));
    return responsePayload.data;
  }, []);

  const updateLead = useCallback(async (id: string, input: UpdateLeadInput) => {
    setError(null);

    const response = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });
    const payload = await readJsonResponse<ApiDataResponse<Lead>>(response);

    if (!response.ok || !payload.data) {
      const message = payload.error ?? "No se pudo actualizar el lead.";
      setError(message);
      throw new Error(message);
    }

    setLeads((current) =>
      sortLeadsByUpdatedAt(current.map((lead) => (lead.id === id ? (payload.data as Lead) : lead)))
    );

    return payload.data;
  }, []);

  const updateEtapa = useCallback(async (id: string, etapa: EtapaLead) => {
    setError(null);

    const response = await fetch(`/api/leads/${id}/etapa`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ etapa })
    });
    const payload = await readJsonResponse<ApiDataResponse<Lead>>(response);

    if (!response.ok || !payload.data) {
      const message = payload.error ?? "No se pudo mover el lead.";
      setError(message);
      throw new Error(message);
    }

    setLeads((current) =>
      sortLeadsByUpdatedAt(current.map((lead) => (lead.id === id ? (payload.data as Lead) : lead)))
    );

    return payload.data;
  }, []);

  const deleteLead = useCallback(async (id: string) => {
    setError(null);

    const response = await fetch(`/api/leads/${id}`, {
      method: "DELETE"
    });
    const payload = await readJsonResponse<ApiDeleteResponse>(response);

    if (!response.ok || !payload.success) {
      const message = payload.error ?? "No se pudo eliminar el lead.";
      setError(message);
      throw new Error(message);
    }

    setLeads((current) => current.filter((lead) => lead.id !== id));
  }, []);

  useEffect(() => {
    void fetchLeads();
  }, [fetchLeads]);

  return {
    leads,
    loading,
    error,
    fetchLeads,
    createLead,
    updateLead,
    updateEtapa,
    deleteLead
  };
}
