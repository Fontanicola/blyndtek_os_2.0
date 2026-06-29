"use client";

import { useEffect, useMemo, useState } from "react";
import { InboundFicha, InboundFiltros, InboundNuevaFicha } from "@/components/inbound";
import { Badge, Button, Toast } from "@/components/ui";
import { useInboundLeads } from "@/lib/hooks/useInboundLeads";
import { createLeadDraft } from "@/lib/leads";
import type { CreateLeadInput, EtapaLead, NivelConfianza } from "@/types/leads";

type FiltrosState = {
  nivel_confianza?: NivelConfianza;
  etapa?: EtapaLead;
};

export default function InboundPage() {
  const { leads, loading, error, fetchLeads, createLead, updateLead } = useInboundLeads();
  const [filtros, setFiltros] = useState<FiltrosState>({});
  const [isNuevaFichaOpen, setIsNuevaFichaOpen] = useState(false);
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

  const activeCount = useMemo(() => {
    return leads.filter((lead) => lead.etapa !== "descartado").length;
  }, [leads]);

  async function handleCreateLead(input: CreateLeadInput) {
    await createLead({
      ...createLeadDraft("por_contactar"),
      ...input,
      canal: "inbound"
    });
  }

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-title text-carbon">Inbound</h1>
          <Badge variant="default">{activeCount} activos</Badge>
        </div>
        <Button onClick={() => setIsNuevaFichaOpen(true)}>Nueva ficha</Button>
      </div>

      <InboundFiltros filtros={filtros} onChange={setFiltros} />

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
          {leads.map((lead) => (
            <InboundFicha
              key={lead.id}
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
