export type DashboardPeriod = "month" | "quarter" | "year";

export type DashboardPipelineStage = {
  etapa: string;
  valor_estimado: number;
  peso: number;
  ponderado: number;
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

export type DashboardComercial = {
  pipeline_ponderado: number;
  pipeline_ponderado_anterior: number;
  pipeline_por_etapa: DashboardPipelineStage[];
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
  runway_meses: number | null;
  runway_serie: DashboardRunwayPoint[];
  cobros_pendientes: number;
  cobros_vencidos: number;
  pl_mes_actual: number;
  pl_mes_anterior: number;
};

export type DashboardEntrega = {
  proyectos_activos: number;
  capacidad_maxima: number;
  pct_entregados_a_tiempo: number | null;
  desvio_promedio_dias: number | null;
  features_completadas_semana: number;
  features_completadas_semana_anterior: number;
};

export type DashboardResponse = {
  period: DashboardPeriod;
  updated_at: string;
  comercial: DashboardComercial;
  financiero: DashboardFinanciero;
  entrega: DashboardEntrega;
};
