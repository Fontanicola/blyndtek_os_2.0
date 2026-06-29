export type CanalLead = "outbound" | "inbound";
export type EtapaLead =
  | "por_contactar"
  | "contactado"
  | "seguimiento"
  | "calificado"
  | "cotizacion"
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
  motivo_descarte: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateLeadInput = Omit<Lead, "id" | "created_at" | "updated_at">;
export type UpdateLeadInput = Partial<CreateLeadInput>;
