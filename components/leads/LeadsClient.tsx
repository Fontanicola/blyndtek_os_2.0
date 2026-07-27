"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KanbanColumn, LeadFormRapido, LeadModal } from "@/components/outbound";
import { LeadEtapaModal } from "./LeadEtapaModal";
import {
  ETAPA_LABELS,
  OUTBOUND_ETAPAS,
  createLeadDraft,
  isForwardLeadTransition,
  sortLeadsByUpdatedAt
} from "@/lib/leads";
import { useLeads } from "@/lib/hooks/useLeads";
import { useInboundLeads } from "@/lib/hooks/useInboundLeads";
import { PageSkeleton } from "@/components/ui";
import type { Usuario } from "@/types/auth";
import type {
  CreateLeadInput,
  EtapaLead,
  Lead,
  LeadStageTransitionInput,
  UpdateLeadInput
} from "@/types/leads";

type LeadsClientProps = {
  usuario: Pick<Usuario, "id" | "rol" | "nombre" | "foto_url">;
};

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
  const router = useRouter();
  const outboundHook = useLeads();
  const inboundHook = useInboundLeads();
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

  const visibleLeads = allLeads;
  const isAdmin = usuario.rol === "admin";

  function handleOpenLead(lead: Lead) {
    setSelectedLead(lead);
    setIsModalOpen(true);
    setActiveQuickForm(null);
    router.replace(`/leads?lead_id=${encodeURIComponent(lead.id)}`, { scroll: false });
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setSelectedLead(null);
    router.replace("/leads", { scroll: false });
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
        <PageSkeleton />
      ) : null}
    </div>
  );
}
