"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { KanbanColumn, LeadFormRapido, LeadModal } from "@/components/outbound";
import { LeadEtapaModal } from "./LeadEtapaModal";
import { Badge, Button, FilterPopover, Input } from "@/components/ui";
import { SearchIcon } from "@/components/icons";
import {
  ETAPA_LABELS,
  OUTBOUND_ETAPAS,
  createLeadDraft,
  isForwardLeadTransition,
  isLeadOverdue,
  sortLeadsByUpdatedAt
} from "@/lib/leads";
import { useLeads } from "@/lib/hooks/useLeads";
import { useInboundLeads } from "@/lib/hooks/useInboundLeads";
import type { Usuario } from "@/types/auth";
import type {
  CreateLeadInput,
  EtapaLead,
  Lead,
  LeadStageTransitionInput,
  NivelConfianza,
  UpdateLeadInput
} from "@/types/leads";

type FilterState = {
  rubro: string;
  ubicacion: string;
  responsable_id: string;
  etapa: string;
  nivel_confianza: string;
  canal: string;
};

type LeadsClientProps = {
  usuario: Pick<Usuario, "id" | "rol" | "nombre" | "foto_url">;
};

const filterSelectClassName =
  "h-10 rounded-component border border-line bg-white px-3 text-sm text-carbon transition-all duration-fast ease-fast focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20";

function normalizeModalInput(input: UpdateLeadInput, etapa: EtapaLead = "por_contactar"): CreateLeadInput {
  const draft = createLeadDraft(etapa);

  return {
    ...draft,
    ...input,
    canal: input.canal ?? draft.canal,
    empresa: input.empresa?.trim() ?? draft.empresa
  };
}

export function LeadsClient({ usuario }: LeadsClientProps) {
  const searchParams = useSearchParams();
  const outboundHook = useLeads();
  const inboundHook = useInboundLeads();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    rubro: "",
    ubicacion: "",
    responsable_id: "",
    etapa: "",
    nivel_confianza: "",
    canal: ""
  });
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeQuickForm, setActiveQuickForm] = useState<EtapaLead | null>(null);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverEtapa, setDragOverEtapa] = useState<EtapaLead | null>(null);
  const [pendingTransition, setPendingTransition] = useState<{ lead: Lead; etapa: EtapaLead } | null>(null);
  const [usuarios, setUsuarios] = useState<Array<Pick<Usuario, "id" | "nombre" | "foto_url">>>([]);

  useEffect(() => {
    let mounted = true;

    async function loadUsuarios() {
      try {
        const response = await fetch("/api/usuarios");
        const payload = (await response.json()) as {
          data?: Array<Pick<Usuario, "id" | "nombre" | "foto_url">>;
        };

        if (mounted && response.ok && payload.data) {
          setUsuarios(payload.data);
        }
      } catch {
        if (mounted) {
          setUsuarios([]);
        }
      }
    }

    void loadUsuarios();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const queryLeadId = searchParams?.get("lead_id") ?? null;

    if (queryLeadId) {
      const matchingLead = [...outboundHook.leads, ...inboundHook.leads].find((lead) => lead.id === queryLeadId) ?? null;
      if (matchingLead) {
        setSelectedLead(matchingLead);
        setIsModalOpen(true);
      }
    }
  }, [inboundHook.leads, outboundHook.leads, searchParams]);

  const allLeads = useMemo(
    () => sortLeadsByUpdatedAt([...outboundHook.leads, ...inboundHook.leads]),
    [inboundHook.leads, outboundHook.leads]
  );

  const visibleLeads = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return allLeads.filter((lead) => {
      if (filters.canal && lead.canal !== filters.canal) {
        return false;
      }

      if (filters.rubro && lead.rubro !== filters.rubro) {
        return false;
      }

      if (filters.ubicacion && lead.ubicacion !== filters.ubicacion) {
        return false;
      }

      if (filters.responsable_id && lead.responsable_id !== filters.responsable_id) {
        return false;
      }

      if (filters.etapa && lead.etapa !== filters.etapa) {
        return false;
      }

      if (filters.nivel_confianza && lead.nivel_confianza !== filters.nivel_confianza) {
        return false;
      }

      if (normalizedSearch) {
        const haystack = [lead.empresa, lead.contacto_1_nombre, lead.contacto_2_nombre]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(normalizedSearch)) {
          return false;
        }
      }

      return true;
    });
  }, [allLeads, filters, search]);

  const overdueCount = visibleLeads.filter(isLeadOverdue).length;
  const activeFiltersCount = Object.values(filters).filter(Boolean).length;
  const rubroOptions = Array.from(new Set(allLeads.map((lead) => lead.rubro).filter(Boolean))).sort();
  const ubicacionOptions = Array.from(new Set(allLeads.map((lead) => lead.ubicacion).filter(Boolean))).sort();
  const responsableOptions = Array.from(
    new Set(allLeads.map((lead) => lead.responsable_id).filter(Boolean))
  ).sort();
  const nivelConfianzaOptions: Array<NivelConfianza> = ["alto", "medio", "bajo"];
  const isAdmin = usuario.rol === "admin";

  function handleOpenNewLead() {
    setSelectedLead(null);
    setIsModalOpen(true);
    setActiveQuickForm(null);
  }

  function handleOpenLead(lead: Lead) {
    setSelectedLead(lead);
    setIsModalOpen(true);
    setActiveQuickForm(null);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setSelectedLead(null);
  }

  async function refreshAllLeads() {
    await Promise.all([outboundHook.fetchLeads(), inboundHook.fetchLeads()]);
  }

  async function updateLeadEtapa(
    lead: Lead,
    etapa: EtapaLead,
    input: LeadStageTransitionInput = {}
  ) {
    if (lead.canal === "inbound") {
      await inboundHook.updateEtapa(lead.id, etapa, input);
    } else {
      await outboundHook.updateEtapa(lead.id, etapa, input);
    }
  }

  async function handleSaveLead(input: UpdateLeadInput) {
    if (selectedLead) {
      if (selectedLead.canal === "inbound") {
        await inboundHook.updateLead(selectedLead.id, input);
      } else {
        await outboundHook.updateLead(selectedLead.id, input);
      }

      await refreshAllLeads();
      return;
    }

    const canal = input.canal ?? "outbound";

    if (canal === "inbound") {
      await inboundHook.createLead(normalizeModalInput(input, (input.etapa as EtapaLead | undefined) ?? "por_contactar"));
    } else {
      await outboundHook.createLead(normalizeModalInput(input, (input.etapa as EtapaLead | undefined) ?? "por_contactar"));
    }

    await refreshAllLeads();
  }

  async function handleDeleteLead() {
    if (!selectedLead) {
      return;
    }

    if (selectedLead.canal === "inbound") {
      await inboundHook.deleteLead(selectedLead.id);
    } else {
      await outboundHook.deleteLead(selectedLead.id);
    }

    await refreshAllLeads();
    setSelectedLead(null);
  }

  async function handleQuickCreate(input: CreateLeadInput) {
    await outboundHook.createLead(input);
    await refreshAllLeads();
    setActiveQuickForm(null);
  }

  async function handleDropLead(targetEtapa: EtapaLead) {
    if (!draggedLeadId) {
      return;
    }

    const lead = allLeads.find((item) => item.id === draggedLeadId);

    if (!lead || lead.etapa === targetEtapa) {
      setDraggedLeadId(null);
      setDragOverEtapa(null);
      return;
    }

    if (isForwardLeadTransition(lead.etapa, targetEtapa)) {
      setPendingTransition({ lead, etapa: targetEtapa });
      setDraggedLeadId(null);
      setDragOverEtapa(null);
      return;
    }

    await updateLeadEtapa(lead, targetEtapa);
    await refreshAllLeads();
    setDraggedLeadId(null);
    setDragOverEtapa(null);
  }

  async function handleConfirmLeadTransition(input: LeadStageTransitionInput) {
    if (!pendingTransition) {
      return;
    }

    const { lead, etapa } = pendingTransition;

    try {
      await updateLeadEtapa(lead, etapa, input);
      await refreshAllLeads();
      setPendingTransition(null);
    } catch {
      // El hook ya guarda el error visible.
    }
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
                value={filters.canal}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, canal: event.target.value }))
                }
                className={filterSelectClassName}
              >
                <option value="">Todos los canales</option>
                <option value="outbound">Outbound</option>
                <option value="inbound">Inbound</option>
              </select>

              <select
                value={filters.rubro}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, rubro: event.target.value }))
                }
                className={filterSelectClassName}
              >
                <option value="">Rubro</option>
                {rubroOptions.map((option) => (
                  <option key={option} value={option ?? ""}>
                    {option}
                  </option>
                ))}
              </select>

              <select
                value={filters.ubicacion}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, ubicacion: event.target.value }))
                }
                className={filterSelectClassName}
              >
                <option value="">Ubicación</option>
                {ubicacionOptions.map((option) => (
                  <option key={option} value={option ?? ""}>
                    {option}
                  </option>
                ))}
              </select>

              <select
                value={filters.responsable_id}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, responsable_id: event.target.value }))
                }
                className={filterSelectClassName}
              >
                <option value="">Responsable</option>
                {responsableOptions.map((option) => (
                  <option key={option} value={option ?? ""}>
                    {option}
                  </option>
                ))}
              </select>

              <select
                value={filters.etapa}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, etapa: event.target.value }))
                }
                className={filterSelectClassName}
              >
                <option value="">Etapa</option>
                {OUTBOUND_ETAPAS.map((etapa) => (
                  <option key={etapa} value={etapa}>
                    {ETAPA_LABELS[etapa]}
                  </option>
                ))}
              </select>

              <select
                value={filters.nivel_confianza}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, nivel_confianza: event.target.value }))
                }
                className={filterSelectClassName}
              >
                <option value="">Confianza</option>
                {nivelConfianzaOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "alto" ? "Alto" : option === "medio" ? "Medio" : "Bajo"}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-line-soft pt-3">
              <p className="text-xs text-graphite">
                {activeFiltersCount > 0 ? `${activeFiltersCount} filtros activos` : "Sin filtros activos"}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setFilters({
                    rubro: "",
                    ubicacion: "",
                    responsable_id: "",
                    etapa: "",
                    nivel_confianza: "",
                    canal: ""
                  })
                }
              >
                Limpiar filtros
              </Button>
            </div>
          </div>
        </FilterPopover>

        <div className="ml-auto flex items-center gap-3">
          <Badge variant="warning">{overdueCount} vencidos</Badge>
          <Button onClick={handleOpenNewLead}>Nuevo lead</Button>
        </div>
      </div>

      {outboundHook.error || inboundHook.error ? (
        <div className="rounded-card border border-danger bg-danger-light px-4 py-3 text-sm text-danger">
          {outboundHook.error ?? inboundHook.error}
        </div>
      ) : null}

      <div className="flex-1 overflow-x-auto pb-6">
        <div className="flex h-full gap-4">
          {OUTBOUND_ETAPAS.map((etapa) => (
            <KanbanColumn
              key={etapa}
              etapa={etapa}
              label={ETAPA_LABELS[etapa]}
              leads={visibleLeads.filter((lead) => lead.etapa === etapa)}
              responsables={usuarios}
              isAdmin={isAdmin}
              onLeadClick={handleOpenLead}
              onAddLead={(nextEtapa) => {
                setActiveQuickForm(nextEtapa);
                setIsModalOpen(false);
              }}
              draggedLeadId={draggedLeadId}
              isDropTarget={dragOverEtapa === etapa}
              onDropLead={(targetEtapa) => {
                void handleDropLead(targetEtapa);
              }}
              onDragEnterColumn={setDragOverEtapa}
              onDragLeaveColumn={() => setDragOverEtapa(null)}
              onDragStartLead={(lead) => {
                setDraggedLeadId(lead.id);
                setDragOverEtapa(lead.etapa);
              }}
              onDragEndLead={() => {
                setDraggedLeadId(null);
                setDragOverEtapa(null);
              }}
              footer={
                activeQuickForm === etapa ? (
                  <LeadFormRapido
                    etapa={etapa}
                    onSave={handleQuickCreate}
                    onCancel={() => setActiveQuickForm(null)}
                  />
                ) : null
              }
            />
          ))}
        </div>
      </div>

      <LeadModal
        lead={selectedLead}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveLead}
        onDelete={handleDeleteLead}
      />

      <LeadEtapaModal
        lead={pendingTransition?.lead ?? null}
        targetEtapa={pendingTransition?.etapa ?? null}
        isOpen={pendingTransition !== null}
        onClose={() => setPendingTransition(null)}
        onConfirm={(input) => handleConfirmLeadTransition(input)}
      />

      {outboundHook.loading || inboundHook.loading ? (
        <div className="text-sm text-graphite">Cargando leads...</div>
      ) : null}
    </div>
  );
}
