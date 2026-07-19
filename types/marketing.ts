import type { CanalOrigenLead } from "@/types/leads";

export type MarketingAtribucionPeriod = "month" | "quarter" | "year" | "todo";

export type MarketingAtribucionRow = {
  canal_origen: CanalOrigenLead;
  canal_label: string;
  campana_origen: string | null;
  leads_generados: number;
  clientes_convertidos: number;
  tasa_conversion_pct: number;
  ingreso_generado_usd: number;
  comision_pagada_usd: number;
};

