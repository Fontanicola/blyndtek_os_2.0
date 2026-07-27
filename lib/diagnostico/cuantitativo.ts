import type { DiagnosticoMetrica, DiagnosticoMetricaTipo } from "@/types/diagnosticoCuantitativo";

export function calcularCostoMensualMetrica(input: Pick<DiagnosticoMetrica, "tipo" | "horas_mes" | "costo_hora_usd" | "cargas_mes" | "minutos_por_carga" | "errores_mes" | "costo_por_error_usd" | "licencias_mes_usd" | "uso_pct" | "oportunidades_mes" | "ticket_promedio_usd" | "tasa_cierre_pct"> & { costo_mensual_usd?: number }) {
  const number = (value: number | null | undefined) => (Number.isFinite(Number(value)) ? Number(value) : 0);

  switch (input.tipo) {
    case "trabajo_manual":
      return number(input.horas_mes) * number(input.costo_hora_usd);
    case "doble_carga":
      return (number(input.cargas_mes) * number(input.minutos_por_carga) / 60) * number(input.costo_hora_usd);
    case "error_operativo":
      return number(input.errores_mes) * number(input.costo_por_error_usd);
    case "licencia":
      return number(input.licencias_mes_usd) * Math.max(0, 1 - number(input.uso_pct) / 100);
    case "venta_perdida":
      return number(input.oportunidades_mes) * number(input.ticket_promedio_usd) * number(input.tasa_cierre_pct) / 100;
    case "otro":
      return number(input.costo_mensual_usd);
  }
}

export function normalizarMetrica<T extends Record<string, unknown>>(metric: T) {
  const normalized = {
    ...metric,
    tipo: metric.tipo as DiagnosticoMetricaTipo,
    horas_mes: Number(metric.horas_mes ?? 0),
    costo_hora_usd: Number(metric.costo_hora_usd ?? 0),
    cargas_mes: Number(metric.cargas_mes ?? 0),
    minutos_por_carga: Number(metric.minutos_por_carga ?? 0),
    errores_mes: Number(metric.errores_mes ?? 0),
    costo_por_error_usd: Number(metric.costo_por_error_usd ?? 0),
    licencias_mes_usd: Number(metric.licencias_mes_usd ?? 0),
    uso_pct: Number(metric.uso_pct ?? 0),
    oportunidades_mes: Number(metric.oportunidades_mes ?? 0),
    ticket_promedio_usd: Number(metric.ticket_promedio_usd ?? 0),
    tasa_cierre_pct: Number(metric.tasa_cierre_pct ?? 0),
    costo_mensual_usd: Number(metric.costo_mensual_usd ?? 0)
  };

  const costoMensual = calcularCostoMensualMetrica(normalized as Parameters<typeof calcularCostoMensualMetrica>[0]);

  return {
    ...normalized,
    costo_mensual_usd: Number(costoMensual.toFixed(2)),
    costo_anual_usd: Number((costoMensual * 12).toFixed(2))
  };
}

export function resumirMetricas(metricas: Array<Record<string, unknown>>) {
  const tipos: DiagnosticoMetricaTipo[] = ["trabajo_manual", "doble_carga", "error_operativo", "licencia", "venta_perdida", "otro"];
  const porTipo = Object.fromEntries(tipos.map((tipo) => [tipo, 0])) as Record<DiagnosticoMetricaTipo, number>;
  let totalMensual = 0;
  let conDatos = 0;
  let confianzaMinima: "alta" | "media" | "baja" = "alta";

  for (const metric of metricas) {
    const normalized = normalizarMetrica(metric);
    const tipo = normalized.tipo as DiagnosticoMetricaTipo;
    const mensual = Number(normalized.costo_mensual_usd ?? 0);

    if (tipos.includes(tipo)) {
      porTipo[tipo] += mensual;
    }
    totalMensual += mensual;
    if (mensual > 0) conDatos += 1;
    if (normalized.confianza === "baja") confianzaMinima = "baja";
    else if (normalized.confianza === "media" && confianzaMinima === "alta") confianzaMinima = "media";
  }

  return {
    total_mensual_usd: Number(totalMensual.toFixed(2)),
    total_anual_usd: Number((totalMensual * 12).toFixed(2)),
    por_tipo: porTipo,
    metricas_con_datos: conDatos,
    confianza: confianzaMinima
  };
}
