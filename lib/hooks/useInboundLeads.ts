"use client";

import { useCallback, useEffect, useState } from "react";
import { sortLeadsByUpdatedAt } from "@/lib/leads";
import type {
  CreateLeadInput,
  EtapaLead,
  Lead,
  NivelConfianza,
  UpdateLeadInput
} from "@/types/leads";

type ApiDataResponse<T> = {
  data?: T;
  error?: string;
};

type InboundLeadFilters = {
  nivel_confianza?: NivelConfianza;
  etapa?: EtapaLead;
};

function buildQueryString(filters?: InboundLeadFilters) {
  const searchParams = new URLSearchParams({
    canal: "inbound"
  });

  if (filters?.etapa) {
    searchParams.set("etapa", filters.etapa);
  }

  if (filters?.nivel_confianza) {
    searchParams.set("nivel_confianza", filters.nivel_confianza);
  }

  return `?${searchParams.toString()}`;
}

function formatNotaTimestamp(date = new Date()) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

export function useInboundLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async (filters?: InboundLeadFilters) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/leads${buildQueryString(filters)}`);
      const payload = (await response.json()) as ApiDataResponse<Lead[]>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudieron cargar los leads inbound.");
      }

      setLeads(sortLeadsByUpdatedAt(payload.data));
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "No se pudieron cargar los leads inbound."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const createLead = useCallback(async (input: CreateLeadInput) => {
    setError(null);

    const payload: CreateLeadInput = {
      ...input,
      canal: "inbound"
    };

    const response = await fetch("/api/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const responsePayload = (await response.json()) as ApiDataResponse<Lead>;

    if (!response.ok || !responsePayload.data) {
      const message = responsePayload.error ?? "No se pudo crear el lead inbound.";
      setError(message);
      throw new Error(message);
    }

    const createdLead = responsePayload.data;

    setLeads((current) => sortLeadsByUpdatedAt([createdLead, ...current]));
    return createdLead;
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
    const payload = (await response.json()) as ApiDataResponse<Lead>;

    if (!response.ok || !payload.data) {
      const message = payload.error ?? "No se pudo actualizar el lead inbound.";
      setError(message);
      throw new Error(message);
    }

    const updatedLead = payload.data;

    setLeads((current) =>
      sortLeadsByUpdatedAt(current.map((lead) => (lead.id === id ? updatedLead : lead)))
    );

    return updatedLead;
  }, []);

  const addNota = useCallback(
    async (id: string, nota: string) => {
      const trimmed = nota.trim();

      if (!trimmed) {
        return null;
      }

      const lead = leads.find((item) => item.id === id);

      if (!lead) {
        return null;
      }

      const timestamp = formatNotaTimestamp();
      const newNotes = `[${timestamp}] ${trimmed}${lead.notas ? `\n${lead.notas}` : ""}`;

      return updateLead(id, {
        notas: newNotes
      });
    },
    [leads, updateLead]
  );

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
    addNota
  };
}
