export type DashboardPeriod = "month" | "quarter" | "year";

export type DashboardPipelineStage = {
  etapa: string;
  valor_estimado: number;
  peso: number;
  ponderado: number;
};

export type DashboardLeadStageCount = {
  etapa: string;
  cantidad: number;
};

export type DashboardWinRateChannel = {
  porcentaje: number | null;
  leads: number;
  clientes: number;
};

export type DashboardRunwayPoint = {
  month: string;
  label: string;
  caja: number;
};

export type DashboardFinancialPoint = {
  month: string;
  label: string;
  ingresos: number;
  egresos: number;
  margen: number;
  clientes_activos: number;
};

export type DashboardVentasVsCobradoPoint = {
  mes: string;
  ventas: number;
  cobrado: number;
};

export type DashboardRecentFeature = {
  id: string;
  nombre: string;
  proyecto_id: string;
  proyecto_nombre: string;
  updated_at: string;
};

export type DashboardComercial = {
  pipeline_ponderado: number;
  pipeline_ponderado_anterior: number;
  pipeline_por_etapa: DashboardPipelineStage[];
  leads_por_etapa: DashboardLeadStageCount[];
  win_rate_por_canal: {
    outbound: DashboardWinRateChannel;
    inbound: DashboardWinRateChannel;
  };
  ticket_promedio: number | null;
  ticket_promedio_anterior: number | null;
  ciclo_cierre_promedio: number | null;
  ciclo_cierre_promedio_anterior: number | null;
};

export type DashboardFinanciero = {
  mrr_actual: number;
  mrr_anterior: number;
  net_new_mrr_mes: number;
  churn: number;
  quema_neta: number;
  runway_meses: number | null;
  runway_estado: "normal" | "estable" | "agotado";
  runway_serie: DashboardRunwayPoint[];
  cobros_pendientes: number;
  cobros_vencidos: number;
  pl_mes_actual: number;
  pl_mes_anterior: number;
  historico_pl: DashboardFinancialPoint[];
  historico_ventas_vs_cobrado: DashboardVentasVsCobradoPoint[];
  total_vendido_6m: number;
};

export type DashboardEntrega = {
  proyectos_activos: number;
  capacidad_maxima: number;
  pct_entregados_a_tiempo: number | null;
  desvio_promedio_dias: number | null;
  features_completadas_semana: number;
  features_completadas_semana_anterior: number;
  features_recientes: DashboardRecentFeature[];
};

export type DashboardResponse = {
  period: DashboardPeriod;
  updated_at: string;
  comercial: DashboardComercial;
  financiero: DashboardFinanciero;
  entrega: DashboardEntrega;
};
