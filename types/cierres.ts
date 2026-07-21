export type CierreMensual = {
  id: string;
  mes: string;
  ingresos_totales_usd: number | null;
  egresos_totales_usd: number | null;
  margen_usd: number | null;
  desvio_pct_vs_anterior: number | null;
  resumen_texto: string | null;
  tokens_entrada: number | null;
  tokens_salida: number | null;
  costo_generacion_usd: number | null;
  generado_at: string;
};
