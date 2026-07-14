export type CanalLead = "outbound" | "inbound";
export type EtapaLead =
  | "por_contactar"
  | "contactado"
  | "seguimiento"
  | "calificado"
  | "cotizacion"
  | "ganado"
  | "descartado";
export type NivelConfianza = "alto" | "medio" | "bajo";

export type Lead = {
  id: string;
  canal: CanalLead;
  empresa: string;
  rubro: string | null;
  ubicacion: string | null;
  contacto_1_nombre: string | null;
  contacto_1_tel: string | null;
  contacto_2_nombre: string | null;
  contacto_2_tel: string | null;
  web: string | null;
  etapa: EtapaLead;
  valor_estimado: number | null;
  responsable_id: string | null;
  llamada_fecha: string | null;
  llamada_hecho: boolean;
  seg1_fecha: string | null;
  seg1_hecho: boolean;
  seg2_fecha: string | null;
  seg2_hecho: boolean;
  referido_por: string | null;
  relacion: string | null;
  nivel_confianza: NivelConfianza | null;
  contexto: string | null;
  presupuesto_estimado: number | null;
  monto_propuesto_desarrollo: number | null;
  monto_propuesto_mensual: number | null;
  monto_negociado_desarrollo: number | null;
  monto_negociado_mensual: number | null;
  motivo_descarte: string | null;
  notas: string | null;
  vendedor_id: string | null;
  created_at: string;
  updated_at: string;
};

export type LeadTouchKey = "llamada" | "seg1" | "seg2";

export type LeadNegociacion = {
  id: string;
  lead_id: string;
  monto_anterior_desarrollo: number | null;
  monto_anterior_mensual: number | null;
  monto_nuevo_desarrollo: number | null;
  monto_nuevo_mensual: number | null;
  nota: string | null;
  creado_por: string | null;
  creado_por_usuario?: { nombre: string | null } | null;
  created_at: string;
};

export type LeadStageTransitionInput = {
  touchpoint?: LeadTouchKey;
  seguimiento_fecha?: string | null;
  calificacion_nota?: string | null;
  monto_propuesto_desarrollo?: number | null;
  monto_propuesto_mensual?: number | null;
  monto_negociado_desarrollo?: number | null;
  monto_negociado_mensual?: number | null;
  motivo_negociacion?: string | null;
  mismo_monto?: boolean;
};

export type CreateLeadInput = Omit<Lead, "id" | "created_at" | "updated_at" | "vendedor_id"> & {
  vendedor_id?: string | null;
};
export type UpdateLeadInput = Partial<CreateLeadInput>;
