import { calculateRunwayProjection } from "@/lib/finanzas/runwayProjection";
import type { Cobro } from "@/types/cobros";
import type { Cliente } from "@/types/clientes";
import type { Egreso } from "@/types/egresos";
import type { Lead } from "@/types/leads";
import type { Proyecto } from "@/types/proyectos";
import type { Suscripcion } from "@/types/suscripciones";

const PIPELINE_WEIGHTS: Record<string, number> = {
  por_contactar: 0.05,
  contactado: 0.1,
  seguimiento: 0.25,
  calificado: 0.5,
  cotizacion: 0.75,
  ganado: 1,
  descartado: 0
};

export type CalcularMetricasAsesorInput = {
  cajaInicial: number;
  runwayObjetivoMeses: number;
  capacidadMaxima?: number;
  leads: Lead[];
  clientes: Cliente[];
  proyectos: Proyecto[];
  cobros: Cobro[];
  egresos: Egreso[];
  suscripciones: Suscripcion[];
  metaAdsDisponible?: boolean;
  referenceDate?: Date;
};

export type ConcentracionRiesgo = {
  cliente_id: string;
  cliente_nombre: string;
  porcentaje: number;
};

export type MetricasAsesorFinanciero = {
  margen_mensual_usd: number;
  runway_actual_meses: number | null;
  runway_objetivo_meses: number;
  excedente_disponible_usd: number;
  proyectos_activos: number;
  capacidad_maxima: number;
  capacidad_disponible_pct: number;
  pipeline_ponderado_usd: number;
  concentracion_riesgo: ConcentracionRiesgo | null;
  meta_ads_disponible: boolean;
  caja_actual_usd: number;
  quema_mensual_usd: number;
  mrr_actual_usd: number;
  costo_mensual_usd: number;
};

function clampPercentage(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function calcularMetricasAsesor({
  cajaInicial,
  runwayObjetivoMeses,
  capacidadMaxima = 5,
  leads,
  clientes,
  proyectos,
  cobros,
  egresos,
  suscripciones,
  metaAdsDisponible = false,
  referenceDate = new Date()
}: CalcularMetricasAsesorInput): MetricasAsesorFinanciero {
  const runwayProjection = calculateRunwayProjection(cajaInicial, cobros, egresos, suscripciones, referenceDate);
  const cajaActual = cajaInicial;
  const costoMensual = runwayProjection.recurringExpenses + runwayProjection.nonRecurringAverage;
  const margenMensual = runwayProjection.mrr - costoMensual;
  const burnMensual = Math.max(runwayProjection.monthlyBurn, 0);
  const excedenteDisponible =
    runwayProjection.runwayMonths != null && runwayProjection.runwayMonths > runwayObjetivoMeses
      ? Math.max(0, cajaActual - burnMensual * runwayObjetivoMeses)
      : 0;

  const proyectosActivos = proyectos.filter((proyecto) => proyecto.estado !== "entregado" && proyecto.estado !== "pausado").length;
  const capacidadDisponiblePct =
    capacidadMaxima > 0 ? clampPercentage((1 - proyectosActivos / capacidadMaxima) * 100) : 0;

  const pipelinePonderado = leads.reduce((total, lead) => {
    const valor = lead.valor_estimado ?? 0;
    const peso = PIPELINE_WEIGHTS[lead.etapa] ?? 0;
    return total + valor * peso;
  }, 0);

  const mrrPorCliente = new Map<string, number>();
  const clienteNombreById = new Map(clientes.map((cliente) => [cliente.id, cliente.empresa]));

  for (const suscripcion of suscripciones) {
    if (suscripcion.estado !== "activa") {
      continue;
    }

    if (!suscripcion.cliente_id) {
      continue;
    }

    const fechaInicioOk = !suscripcion.fecha_inicio || new Date(suscripcion.fecha_inicio) <= referenceDate;
    const fechaBajaOk = !suscripcion.fecha_baja || new Date(suscripcion.fecha_baja) > referenceDate;

    if (!fechaInicioOk || !fechaBajaOk) {
      continue;
    }

    mrrPorCliente.set(suscripcion.cliente_id, (mrrPorCliente.get(suscripcion.cliente_id) ?? 0) + suscripcion.monto_mensual);
  }

  let concentracionRiesgo: ConcentracionRiesgo | null = null;
  let mayorPorcentaje = 0;
  const totalMrr = Array.from(mrrPorCliente.values()).reduce((total, value) => total + value, 0);

  if (totalMrr > 0) {
    for (const [clienteId, mrr] of mrrPorCliente.entries()) {
      const porcentaje = (mrr / totalMrr) * 100;
      if (porcentaje > mayorPorcentaje) {
        mayorPorcentaje = porcentaje;
        concentracionRiesgo = {
          cliente_id: clienteId,
          cliente_nombre: clienteNombreById.get(clienteId) ?? "Cliente sin nombre",
          porcentaje
        };
      }
    }

    if (mayorPorcentaje <= 30) {
      concentracionRiesgo = null;
    }
  }

  return {
    margen_mensual_usd: margenMensual,
    runway_actual_meses: runwayProjection.runwayMonths,
    runway_objetivo_meses: runwayObjetivoMeses,
    excedente_disponible_usd: excedenteDisponible,
    proyectos_activos: proyectosActivos,
    capacidad_maxima: capacidadMaxima,
    capacidad_disponible_pct: capacidadDisponiblePct,
    pipeline_ponderado_usd: pipelinePonderado,
    concentracion_riesgo: concentracionRiesgo,
    meta_ads_disponible: metaAdsDisponible,
    caja_actual_usd: cajaActual,
    quema_mensual_usd: burnMensual,
    mrr_actual_usd: runwayProjection.mrr,
    costo_mensual_usd: costoMensual
  };
}
