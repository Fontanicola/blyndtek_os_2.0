"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { InboundFicha, InboundNuevaFicha } from "@/components/inbound";
import { Badge, Button, FilterPopover, Input, Toast } from "@/components/ui";
import { SearchIcon } from "@/components/icons";
import { ETAPA_LABELS, OUTBOUND_ETAPAS } from "@/lib/leads";
import { useInboundLeads } from "@/lib/hooks/useInboundLeads";
import { createLeadDraft } from "@/lib/leads";
import type { CreateLeadInput, EtapaLead, NivelConfianza } from "@/types/leads";

type FiltrosState = {
  nivel_confianza?: NivelConfianza;
  etapa?: EtapaLead;
};

export default function InboundPage() {
  const searchParams = useSearchParams();
  const { leads, loading, error, fetchLeads, createLead, updateLead } = useInboundLeads();
  const [search, setSearch] = useState("");
  const [filtros, setFiltros] = useState<FiltrosState>({});
  const [isNuevaFichaOpen, setIsNuevaFichaOpen] = useState(false);
  const [highlightedLeadId, setHighlightedLeadId] = useState<string | null>(searchParams?.get("lead_id") ?? null);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "info" | "warning" | "error";
  }>({
    visible: false,
    message: "",
    type: "info"
  });

  useEffect(() => {
    void fetchLeads(filtros);
  }, [fetchLeads, filtros]);

  useEffect(() => {
    const queryLeadId = searchParams?.get("lead_id") ?? null;
    if (queryLeadId) {
      setHighlightedLeadId(queryLeadId);
    }
  }, [searchParams]);

  const visibleLeads = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return leads.filter((lead) => {
      if (filtros.nivel_confianza && lead.nivel_confianza !== filtros.nivel_confianza) {
        return false;
      }

      if (filtros.etapa && lead.etapa !== filtros.etapa) {
        return false;
      }

      if (normalizedSearch) {
        const haystack = [
          lead.empresa,
          lead.contacto_1_nombre,
          lead.contacto_2_nombre
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(normalizedSearch)) {
          return false;
        }
      }

      return true;
    });
  }, [filtros, leads, search]);

  const activeCount = useMemo(() => {
    return visibleLeads.filter((lead) => lead.etapa !== "descartado").length;
  }, [visibleLeads]);
  const activeFiltersCount = Object.values(filtros).filter(Boolean).length;

  useEffect(() => {
    if (!highlightedLeadId) {
      return;
    }

    const element = document.getElementById(`lead-${highlightedLeadId}`);
    element?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [highlightedLeadId, visibleLeads.length]);

  async function handleCreateLead(input: CreateLeadInput) {
    await createLead({
      ...createLeadDraft("por_contactar"),
      ...input,
      canal: "inbound"
    });
  }

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex flex-wrap items-end gap-3">
        <Input
          label="Buscar"
          placeholder="Empresa o contacto"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          leftIcon={<SearchIcon />}
          className="min-w-[240px] flex-1"
        />

        <FilterPopover activeCount={activeFiltersCount}>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <select
                value={filtros.nivel_confianza ?? ""}
                onChange={(event) =>
                  setFiltros((current) => ({
                    ...current,
                    nivel_confianza: (event.target.value || undefined) as NivelConfianza | undefined
                  }))
                }
                className="h-10 rounded-component border border-line bg-white px-3 text-sm text-carbon transition-all duration-fast ease-fast focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
              >
                <option value="">Todos los niveles</option>
                <option value="alto">Alto</option>
                <option value="medio">Medio</option>
                <option value="bajo">Bajo</option>
              </select>

              <select
                value={filtros.etapa ?? ""}
                onChange={(event) =>
                  setFiltros((current) => ({
                    ...current,
                    etapa: (event.target.value || undefined) as EtapaLead | undefined
                  }))
                }
                className="h-10 rounded-component border border-line bg-white px-3 text-sm text-carbon transition-all duration-fast ease-fast focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
              >
                <option value="">Todas las etapas</option>
                {OUTBOUND_ETAPAS.map((etapa) => (
                  <option key={etapa} value={etapa}>
                    {ETAPA_LABELS[etapa]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-line-soft pt-3">
              <p className="text-xs text-graphite">
                {activeFiltersCount > 0 ? `${activeFiltersCount} filtros activos` : "Sin filtros activos"}
              </p>
              <Button variant="ghost" size="sm" onClick={() => setFiltros({})}>
                Limpiar filtros
              </Button>
            </div>
          </div>
        </FilterPopover>

        <div className="ml-auto flex items-center gap-3">
          <Badge variant="default">{activeCount} activos</Badge>
          <Button onClick={() => setIsNuevaFichaOpen(true)}>Nueva ficha</Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-card border border-danger bg-danger-light px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {loading && leads.length === 0 ? (
        <div className="text-sm text-graphite">Cargando leads inbound...</div>
      ) : null}

      {!loading && leads.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-card bg-white p-10 text-center shadow-soft">
          <p className="text-lg font-title text-carbon">Sin leads inbound todavía</p>
          <Button onClick={() => setIsNuevaFichaOpen(true)}>Nueva ficha</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 pb-6">
          {visibleLeads.map((lead) => (
            <div
              key={lead.id}
              id={`lead-${lead.id}`}
              className={
                highlightedLeadId === lead.id
                  ? "rounded-card ring-2 ring-signal ring-offset-4 ring-offset-paper"
                  : ""
              }
            >
              <InboundFicha
                lead={lead}
                onUpdate={(input) => void updateLead(lead.id, input)}
                onPasarACotizacion={(currentLead) => {
                  void updateLead(currentLead.id, { etapa: "cotizacion" });
                  setToast({
                    visible: true,
                    message: "Lead pasado a cotización. El cotizador se construye en el paso 1.4.",
                    type: "info"
                  });
                }}
              />
            </div>
          ))}
        </div>
      )}

      <InboundNuevaFicha
        isOpen={isNuevaFichaOpen}
        onClose={() => setIsNuevaFichaOpen(false)}
        onSave={handleCreateLead}
      />

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((current) => ({ ...current, visible: false }))}
      />
    </div>
  );
}
