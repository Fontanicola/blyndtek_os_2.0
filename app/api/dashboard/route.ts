import { NextRequest, NextResponse } from "next/server";
import { buildRunwaySeries } from "@/lib/finanzas";
import { getCurrentWeekRange, getDashboardPeriodRange, isInRange } from "@/lib/dashboard";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Cliente } from "@/types/clientes";
import type { Cobro } from "@/types/cobros";
import type { Cotizacion } from "@/types/cotizaciones";
import type { Egreso } from "@/types/egresos";
import type { Feature } from "@/types/features";
import type { Lead } from "@/types/leads";
import type { Proyecto } from "@/types/proyectos";
import type { Suscripcion } from "@/types/suscripciones";
import type { DashboardPeriod, DashboardResponse, DashboardWinRateChannel } from "@/types/dashboard";

const PIPELINE_WEIGHTS: Record<string, number> = {
  por_contactar: 0.05,
  contactado: 0.1,
  seguimiento: 0.25,
  calificado: 0.5,
  cotizacion: 0.75,
  descartado: 0
};

const CAPACIDAD_MAXIMA_DEFAULT = 5;

function parsePeriod(value: string | null): DashboardPeriod {
  if (value === "quarter" || value === "year") {
    return value;
  }

  return "month";
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function clampPct(value: number | null) {
  if (value == null) {
    return null;
  }

  return Math.max(0, Math.min(100, value));
}

function buildPipelineStages(leads: Lead[]) {
  const etapas = ["por_contactar", "contactado", "seguimiento", "calificado", "cotizacion", "descartado"] as const;

  return etapas.map((etapa) => {
    const leadsEnEtapa = leads.filter((lead) => lead.etapa === etapa);
    const valorEstimado = leadsEnEtapa.reduce((total, lead) => total + (lead.valor_estimado ?? 0), 0);
    const peso = PIPELINE_WEIGHTS[etapa] ?? 0;

    return {
      etapa,
      valor_estimado: valorEstimado,
      peso,
      ponderado: valorEstimado * peso
    };
  });
}

function buildWinRateChannel(leads: Lead[], clientes: Cliente[], canal: "outbound" | "inbound"): DashboardWinRateChannel {
  const canalLeads = leads.filter((lead) => lead.canal === canal);
  const leadIdsConCliente = new Set(
    clientes
      .filter((cliente) => cliente.lead_id && canalLeads.some((lead) => lead.id === cliente.lead_id))
      .map((cliente) => cliente.lead_id as string)
  );

  const porcentaje = canalLeads.length > 0 ? (leadIdsConCliente.size / canalLeads.length) * 100 : null;

  return {
    porcentaje: clampPct(porcentaje),
    leads: canalLeads.length,
    clientes: leadIdsConCliente.size
  };
}

function calculateMrrAtDate(suscripciones: Suscripcion[], reference: Date) {
  return suscripciones
    .filter((suscripcion) => {
      const fechaInicioOk = !suscripcion.fecha_inicio || new Date(suscripcion.fecha_inicio) <= reference;
      const fechaBajaOk = !suscripcion.fecha_baja || new Date(suscripcion.fecha_baja) > reference;
      return suscripcion.estado === "activa" && fechaInicioOk && fechaBajaOk;
    })
    .reduce((total, suscripcion) => total + suscripcion.monto_mensual, 0);
}

function calculateGrossNewMrr(suscripciones: Suscripcion[], start: Date, end: Date) {
  return suscripciones
    .filter((suscripcion) => suscripcion.estado === "activa" && suscripcion.fecha_inicio && isInRange(suscripcion.fecha_inicio, start, end))
    .reduce((total, suscripcion) => total + suscripcion.monto_mensual, 0);
}

function calculateChurn(suscripciones: Suscripcion[], start: Date, end: Date) {
  return suscripciones
    .filter((suscripcion) => suscripcion.estado === "baja" && suscripcion.fecha_baja && isInRange(suscripcion.fecha_baja, start, end))
    .reduce((total, suscripcion) => total + suscripcion.monto_mensual, 0);
}

function buildBurnRate(cobros: Cobro[], egresos: Egreso[], periodEnd: Date) {
  const months = [
    new Date(periodEnd.getFullYear(), periodEnd.getMonth() - 2, 1),
    new Date(periodEnd.getFullYear(), periodEnd.getMonth() - 1, 1),
    new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1)
  ];

  const rates = months.map((start) => {
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const ingresos = cobros
      .filter((cobro) => cobro.estado === "cobrado" && cobro.fecha_cobro)
      .filter((cobro) => isInRange(cobro.fecha_cobro ?? cobro.fecha_emision, start, end))
      .reduce((total, cobro) => total + cobro.monto, 0);
    const egresosMes = egresos
      .filter((egreso) => isInRange(egreso.fecha, start, end))
      .reduce((total, egreso) => total + egreso.monto, 0);

    return egresosMes - ingresos;
  });

  return average(rates) ?? 0;
}

function getLastUpdatedAt(...groups: Array<Array<{ updated_at?: string; created_at?: string }>>) {
  let latest: Date | null = null;

  for (const group of groups) {
    for (const item of group) {
      const value = item.updated_at ?? item.created_at;
      if (!value) {
        continue;
      }

      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        continue;
      }

      if (!latest || date > latest) {
        latest = date;
      }
    }
  }

  return (latest ?? new Date()).toISOString();
}

function isProyectoActivo(proyecto: Proyecto) {
  return proyecto.estado !== "entregado" && proyecto.estado !== "pausado";
}

function getPreviousWeekRange() {
  const { start, end } = getCurrentWeekRange();
  const previousStart = new Date(start);
  previousStart.setDate(previousStart.getDate() - 7);
  const previousEnd = new Date(end);
  previousEnd.setDate(previousEnd.getDate() - 7);
  return { start: previousStart, end: previousEnd };
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const period = parsePeriod(request.nextUrl.searchParams.get("period"));
    const range = getDashboardPeriodRange(period);
    const currentWeek = getCurrentWeekRange();
    const previousWeek = getPreviousWeekRange();
    const supabase = createAdminClient();

    const [
      leadsResult,
      clientesResult,
      cotizacionesResult,
      proyectosResult,
      featuresResult,
      cobrosResult,
      egresosResult,
      suscripcionesResult,
      configResult
    ] = await Promise.all([
      supabase.from("leads").select("*"),
      supabase.from("clientes").select("*"),
      supabase.from("cotizaciones").select("*"),
      supabase.from("proyectos").select("*"),
      supabase.from("features").select("*"),
      supabase.from("cobros").select("*"),
      supabase.from("egresos").select("*"),
      supabase.from("suscripciones").select("*"),
      supabase.from("config_finanzas").select("*").order("updated_at", { ascending: false }).limit(1)
    ]);

    const errors = [
      leadsResult.error,
      clientesResult.error,
      cotizacionesResult.error,
      proyectosResult.error,
      featuresResult.error,
      cobrosResult.error,
      egresosResult.error,
      suscripcionesResult.error,
      configResult.error
    ].filter(Boolean);

    if (errors.length > 0) {
      return NextResponse.json({ error: errors[0]?.message ?? "No se pudo calcular el dashboard." }, { status: 500 });
    }

    const leads = (leadsResult.data ?? []) as Lead[];
    const clientes = (clientesResult.data ?? []) as Cliente[];
    const cotizaciones = (cotizacionesResult.data ?? []) as Cotizacion[];
    const proyectos = (proyectosResult.data ?? []) as Proyecto[];
    const features = (featuresResult.data ?? []) as Feature[];
    const cobros = (cobrosResult.data ?? []) as Cobro[];
    const egresos = (egresosResult.data ?? []) as Egreso[];
    const suscripciones = (suscripcionesResult.data ?? []) as Suscripcion[];
    const cajaInicial = configResult.data?.[0]?.caja_inicial ?? 0;

    const periodLeads = leads.filter((lead) => isInRange(lead.created_at, range.start, range.end));
    const previousLeads = leads.filter((lead) => isInRange(lead.created_at, range.previousStart, range.previousEnd));
    const periodClientes = clientes.filter((cliente) => isInRange(cliente.created_at, range.start, range.end));
    const previousClientes = clientes.filter((cliente) => isInRange(cliente.created_at, range.previousStart, range.previousEnd));
    const periodCotizaciones = cotizaciones.filter((cotizacion) => cotizacion.estado === "aceptada" && isInRange(cotizacion.updated_at, range.start, range.end));
    const previousCotizaciones = cotizaciones.filter((cotizacion) => cotizacion.estado === "aceptada" && isInRange(cotizacion.updated_at, range.previousStart, range.previousEnd));

    const pipelineStages = buildPipelineStages(periodLeads);
    const pipelineStagesPrev = buildPipelineStages(previousLeads);
    const pipelinePonderado = pipelineStages.reduce((total, stage) => total + stage.ponderado, 0);
    const pipelinePonderadoAnterior = pipelineStagesPrev.reduce((total, stage) => total + stage.ponderado, 0);

    const winRateOutbound = buildWinRateChannel(periodLeads, periodClientes, "outbound");
    const winRateInbound = buildWinRateChannel(periodLeads, periodClientes, "inbound");

    const ticketPromedio = average(periodCotizaciones.map((cotizacion) => cotizacion.precio_total ?? 0));
    const ticketPromedioAnterior = average(previousCotizaciones.map((cotizacion) => cotizacion.precio_total ?? 0));

    const leadMap = new Map(leads.map((lead) => [lead.id, lead]));
    const cycleValues = periodClientes
      .filter((cliente) => cliente.lead_id && leadMap.has(cliente.lead_id))
      .map((cliente) => {
        const lead = leadMap.get(cliente.lead_id as string);
        if (!lead) {
          return null;
        }

        return (new Date(cliente.created_at).getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24);
      })
      .filter((value): value is number => value != null);

    const previousCycleValues = previousClientes
      .filter((cliente) => cliente.lead_id && leadMap.has(cliente.lead_id))
      .map((cliente) => {
        const lead = leadMap.get(cliente.lead_id as string);
        if (!lead) {
          return null;
        }

        return (new Date(cliente.created_at).getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24);
      })
      .filter((value): value is number => value != null);

    const cicloCierrePromedio = average(cycleValues);
    const cicloCierrePromedioAnterior = average(previousCycleValues);

    const mrrActual = calculateMrrAtDate(suscripciones, range.end);
    const mrrAnterior = calculateMrrAtDate(suscripciones, range.previousEnd);
    const grossNewMrr = calculateGrossNewMrr(suscripciones, range.start, range.end);
    const churn = calculateChurn(suscripciones, range.start, range.end);
    const netNewMrrMes = grossNewMrr - churn;

    const cobrosPendientes = cobros.filter((cobro) => cobro.estado === "pendiente").reduce((total, cobro) => total + cobro.monto, 0);
    const cobrosVencidos = cobros
      .filter((cobro) => cobro.estado === "vencido" || (cobro.estado === "pendiente" && new Date(cobro.fecha_vencimiento) < new Date()))
      .reduce((total, cobro) => total + cobro.monto, 0);

    const ingresosActual = cobros
      .filter((cobro) => cobro.estado === "cobrado" && cobro.fecha_cobro && isInRange(cobro.fecha_cobro, range.start, range.end))
      .reduce((total, cobro) => total + cobro.monto, 0);
    const egresosActual = egresos
      .filter((egreso) => isInRange(egreso.fecha, range.start, range.end))
      .reduce((total, egreso) => total + egreso.monto, 0);
    const ingresosPrevios = cobros
      .filter((cobro) => cobro.estado === "cobrado" && cobro.fecha_cobro && isInRange(cobro.fecha_cobro, range.previousStart, range.previousEnd))
      .reduce((total, cobro) => total + cobro.monto, 0);
    const egresosPrevios = egresos
      .filter((egreso) => isInRange(egreso.fecha, range.previousStart, range.previousEnd))
      .reduce((total, egreso) => total + egreso.monto, 0);

    const plMesActual = ingresosActual - egresosActual;
    const plMesAnterior = ingresosPrevios - egresosPrevios;

    const cajaActual = cajaInicial + cobros.filter((cobro) => cobro.estado === "cobrado").reduce((total, cobro) => total + cobro.monto, 0) - egresos.reduce((total, egreso) => total + egreso.monto, 0);
    const quemaNeta = buildBurnRate(cobros, egresos, new Date());
    const runwayMeses = quemaNeta > 0 ? cajaActual / quemaNeta : null;
    const runwaySerie = buildRunwaySeries(cajaActual, quemaNeta, 12);

    const proyectosActivos = proyectos.filter(isProyectoActivo).length;
    const entregadosEnPeriodo = proyectos.filter(
      (proyecto) => proyecto.entrega_real && proyecto.entrega_comprometida && isInRange(proyecto.entrega_real, range.start, range.end)
    );
    const entregadosATiempo = entregadosEnPeriodo.filter((proyecto) => new Date(proyecto.entrega_real!) <= new Date(proyecto.entrega_comprometida!)).length;
    const pctEntregadosATiempo = entregadosEnPeriodo.length > 0 ? (entregadosATiempo / entregadosEnPeriodo.length) * 100 : null;
    const desvioPromedioDias = entregadosEnPeriodo.length > 0
      ? average(
          entregadosEnPeriodo.map((proyecto) => {
            const real = new Date(proyecto.entrega_real!);
            const comprometida = new Date(proyecto.entrega_comprometida!);
            return (real.getTime() - comprometida.getTime()) / (1000 * 60 * 60 * 24);
          })
        )
      : null;

    const featuresCompletadasSemana = features.filter(
      (feature) => feature.estado === "lista" && isInRange(feature.created_at, currentWeek.start, currentWeek.end)
    ).length;
    const featuresCompletadasSemanaAnterior = features.filter(
      (feature) => feature.estado === "lista" && isInRange(feature.created_at, previousWeek.start, previousWeek.end)
    ).length;

    const latestUpdatedAt = getLastUpdatedAt(
      leads,
      clientes,
      cotizaciones,
      proyectos,
      features,
      cobros,
      egresos,
      suscripciones,
      configResult.data ?? []
    );

    const response: DashboardResponse = {
      period,
      updated_at: latestUpdatedAt,
      comercial: {
        pipeline_ponderado: pipelinePonderado,
        pipeline_ponderado_anterior: pipelinePonderadoAnterior,
        pipeline_por_etapa: pipelineStages,
        win_rate_por_canal: {
          outbound: winRateOutbound,
          inbound: winRateInbound
        },
        ticket_promedio: ticketPromedio,
        ticket_promedio_anterior: ticketPromedioAnterior,
        ciclo_cierre_promedio: cicloCierrePromedio,
        ciclo_cierre_promedio_anterior: cicloCierrePromedioAnterior
      },
      financiero: {
        mrr_actual: mrrActual,
        mrr_anterior: mrrAnterior,
        net_new_mrr_mes: netNewMrrMes,
        churn,
        runway_meses: runwayMeses,
        runway_serie: runwaySerie,
        cobros_pendientes: cobrosPendientes,
        cobros_vencidos: cobrosVencidos,
        pl_mes_actual: plMesActual,
        pl_mes_anterior: plMesAnterior
      },
      entrega: {
        proyectos_activos: proyectosActivos,
        capacidad_maxima: CAPACIDAD_MAXIMA_DEFAULT,
        pct_entregados_a_tiempo: clampPct(pctEntregadosATiempo),
        desvio_promedio_dias: desvioPromedioDias,
        features_completadas_semana: featuresCompletadasSemana,
        features_completadas_semana_anterior: featuresCompletadasSemanaAnterior
      }
    };

    return NextResponse.json({ data: response });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
