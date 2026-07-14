"use client";

import { useEffect, useMemo, useState } from "react";
import { KanbanColumn, LeadFormRapido, LeadModal } from "@/components/outbound";
import { Badge, Button, FilterPopover, Input } from "@/components/ui";
import {
  ETAPA_LABELS,
  OUTBOUND_ETAPAS,
  createLeadDraft,
  isLeadOverdue
} from "@/lib/leads";
import { useLeads } from "@/lib/hooks/useLeads";
import { SearchIcon } from "@/components/icons";
import type { Usuario } from "@/types/auth";
import type { CreateLeadInput, EtapaLead, Lead, UpdateLeadInput } from "@/types/leads";

type FilterState = {
  rubro: string;
  ubicacion: string;
  responsable_id: string;
  etapa: string;
};

const filterSelectClassName =
  "h-10 rounded-component border border-line bg-white px-3 text-sm text-carbon transition-all duration-fast ease-fast focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20";

function normalizeModalInput(input: UpdateLeadInput, etapa: EtapaLead = "por_contactar"): CreateLeadInput {
  const draft = createLeadDraft(etapa);

  return {
    ...draft,
    ...input,
    canal: "outbound",
    empresa: input.empresa?.trim() ?? draft.empresa
  };
}

export default function OutboundPage() {
  const { leads, loading, error, createLead, updateLead, updateEtapa, deleteLead } = useLeads();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    rubro: "",
    ubicacion: "",
    responsable_id: "",
    etapa: ""
  });
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeQuickForm, setActiveQuickForm] = useState<EtapaLead | null>(null);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverEtapa, setDragOverEtapa] = useState<EtapaLead | null>(null);
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

  const visibleLeads = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return leads.filter((lead) => {
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
  }, [filters, leads, search]);

  const overdueCount = visibleLeads.filter(isLeadOverdue).length;
  const activeFiltersCount = Object.values(filters).filter(Boolean).length;
  const rubroOptions = Array.from(new Set(leads.map((lead) => lead.rubro).filter(Boolean))).sort();
  const ubicacionOptions = Array.from(
    new Set(leads.map((lead) => lead.ubicacion).filter(Boolean))
  ).sort();
  const responsableOptions = Array.from(
    new Set(leads.map((lead) => lead.responsable_id).filter(Boolean))
  ).sort();

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

  async function handleSaveLead(input: UpdateLeadInput) {
    if (selectedLead) {
      await updateLead(selectedLead.id, input);
      return;
    }

    await createLead(normalizeModalInput(input, (input.etapa as EtapaLead | undefined) ?? "por_contactar"));
  }

  async function handleDeleteLead() {
    if (!selectedLead) {
      return;
    }

    await deleteLead(selectedLead.id);
    setSelectedLead(null);
  }

  async function handleQuickCreate(input: CreateLeadInput) {
    await createLead(input);
    setActiveQuickForm(null);
  }

  async function handleDropLead(targetEtapa: EtapaLead) {
    if (!draggedLeadId) {
      return;
    }

    const lead = leads.find((item) => item.id === draggedLeadId);

    if (!lead || lead.etapa === targetEtapa) {
      setDraggedLeadId(null);
      setDragOverEtapa(null);
      return;
    }

    await updateEtapa(draggedLeadId, targetEtapa);
    setDraggedLeadId(null);
    setDragOverEtapa(null);
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
                    etapa: ""
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

      {error ? (
        <div className="rounded-card border border-danger bg-danger-light px-4 py-3 text-sm text-danger">
          {error}
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

      {loading ? <div className="text-sm text-graphite">Cargando leads...</div> : null}
    </div>
  );
}
