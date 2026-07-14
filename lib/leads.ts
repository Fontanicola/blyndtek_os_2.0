import type { CreateLeadInput, EtapaLead, Lead, UpdateLeadInput } from "@/types/leads";

export const OUTBOUND_ETAPAS: EtapaLead[] = [
  "por_contactar",
  "contactado",
  "seguimiento",
  "calificado",
  "cotizacion",
  "ganado",
  "descartado"
];

export const ETAPA_LABELS: Record<EtapaLead, string> = {
  por_contactar: "Por contactar",
  contactado: "Contactado",
  seguimiento: "En seguimiento",
  calificado: "Calificado",
  cotizacion: "Pasado a cotización",
  ganado: "Ganado",
  descartado: "Descartado"
};

export type LeadFilters = {
  etapa?: EtapaLead;
  responsable_id?: string;
  rubro?: string;
  ubicacion?: string;
};

export function createLeadDraft(etapa: EtapaLead = "por_contactar"): CreateLeadInput {
  return {
    canal: "outbound",
    empresa: "",
    rubro: null,
    ubicacion: null,
    contacto_1_nombre: null,
    contacto_1_tel: null,
    contacto_2_nombre: null,
    contacto_2_tel: null,
    web: null,
    etapa,
    valor_estimado: null,
    responsable_id: null,
    llamada_fecha: null,
    llamada_hecho: false,
    seg1_fecha: null,
    seg1_hecho: false,
    seg2_fecha: null,
    seg2_hecho: false,
    referido_por: null,
    relacion: null,
    nivel_confianza: null,
    contexto: null,
    presupuesto_estimado: null,
    monto_propuesto_desarrollo: null,
    monto_propuesto_mensual: null,
    monto_negociado_desarrollo: null,
    monto_negociado_mensual: null,
    motivo_descarte: null,
    notas: null
  };
}

export function getLeadEtapaIndex(etapa: EtapaLead) {
  return OUTBOUND_ETAPAS.indexOf(etapa);
}

export function isForwardLeadTransition(origen: EtapaLead, destino: EtapaLead) {
  return getLeadEtapaIndex(destino) > getLeadEtapaIndex(origen);
}

export function sanitizeTextValue(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function sanitizeNumberValue(value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isLeadOverdue(lead: Lead): boolean {
  const now = new Date();
  const checks = [
    { date: lead.llamada_fecha, done: lead.llamada_hecho },
    { date: lead.seg1_fecha, done: lead.seg1_hecho },
    { date: lead.seg2_fecha, done: lead.seg2_hecho }
  ];

  return checks.some(({ date, done }) => {
    if (!date || done) {
      return false;
    }

    return new Date(date) < now;
  });
}

export function mergeLeadUpdate(lead: Lead, input: UpdateLeadInput): Lead {
  return {
    ...lead,
    ...input
  };
}

export function sortLeadsByUpdatedAt(leads: Lead[]): Lead[] {
  return [...leads].sort((first, second) => {
    return new Date(second.updated_at).getTime() - new Date(first.updated_at).getTime();
  });
}
