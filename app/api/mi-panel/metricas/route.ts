import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { startOfMonth, endOfMonth } from "@/lib/calendario";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ConfigComisiones } from "@/types/comisiones";
import type { EtapaLead } from "@/types/leads";

type LeadStageSummary = {
  etapa: EtapaLead;
  cantidad: number;
};

type MiPanelBono = {
  disponible: boolean;
  monto_usd: number;
  umbral_ventas_usd: number;
  ventas_mes_usd: number;
};

type MiPanelMetricasResponse = {
  data: {
    leads_totales: number;
    leads_por_etapa: LeadStageSummary[];
    clientes_convertidos: number;
    ventas_cerradas_mes: {
      count: number;
      monto: number;
    };
    pipeline_potencial_usd: number;
    historico_ventas: Array<{
      mes: string;
      cantidad_ventas: number;
      monto_total_usd: number;
    }>;
    comision_pendiente_usd: number;
    comision_pagada_usd: number;
    bono: MiPanelBono | null;
  };
};

const ETAPAS: EtapaLead[] = [
  "por_contactar",
  "contactado",
  "seguimiento",
  "calificado",
  "cotizacion",
  "ganado",
  "descartado"
];

async function getActiveConfig(supabase: ReturnType<typeof createAdminClient>) {
  const { data, error } = await supabase
    .from("config_comisiones")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return (data?.[0] as ConfigComisiones | undefined) ?? null;
}

function getMonthRange() {
  const now = new Date();

  return {
    desde: startOfMonth(now).toISOString(),
    hasta: endOfMonth(now).toISOString()
  };
}

function buildLastSixMonths() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("es-AR", {
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  });

  return Array.from({ length: 6 }).map((_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - index), 1));

    return {
      key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
      mes: formatter.format(date).replace(/\./g, ""),
      date
    };
  });
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    if (currentUser.rol !== "comercial" && currentUser.rol !== "admin") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const supabase = createAdminClient();
    const vendedorId = currentUser.id;
    const { desde, hasta } = getMonthRange();
    const historicalMonths = buildLastSixMonths();

    const [leadsResult, clientesResult, comisionesMesResult, comisionesTotalesResult, configResult] =
      await Promise.all([
        supabase
          .from("leads")
          .select("id, etapa, monto_propuesto_desarrollo, monto_negociado_desarrollo, updated_at")
          .eq("vendedor_id", vendedorId),
        supabase
          .from("clientes")
          .select("id, lead_id, created_at")
          .eq("vendedor_id", vendedorId)
          .not("lead_id", "is", null),
        supabase
          .from("comisiones")
          .select("id, monto_venta, estado")
          .eq("vendedor_id", vendedorId)
          .neq("estado", "cancelada")
          .gte("created_at", desde)
          .lte("created_at", hasta),
        supabase
          .from("comisiones")
          .select("id, monto_comision, estado")
          .eq("vendedor_id", vendedorId),
        getActiveConfig(supabase)
      ]);

    if (leadsResult.error) {
      return NextResponse.json({ error: leadsResult.error.message }, { status: 500 });
    }

    if (clientesResult.error) {
      return NextResponse.json({ error: clientesResult.error.message }, { status: 500 });
    }

    if (comisionesMesResult.error) {
      return NextResponse.json({ error: comisionesMesResult.error.message }, { status: 500 });
    }

    if (comisionesTotalesResult.error) {
      return NextResponse.json({ error: comisionesTotalesResult.error.message }, { status: 500 });
    }

    const leads = leadsResult.data ?? [];
    const clientes = clientesResult.data ?? [];
    const comisionesMes = comisionesMesResult.data ?? [];
    const comisionesTotales = comisionesTotalesResult.data ?? [];
    const salesByLeadId = new Map(
      clientes
        .filter((cliente) => cliente.lead_id)
        .map((cliente) => [cliente.lead_id as string, cliente.created_at])
    );

    const leadsPorEtapa = ETAPAS.map((etapa) => ({
      etapa,
      cantidad: leads.filter((lead) => lead.etapa === etapa).length
    }));

    const pipelinePotencialUsd = leads
      .filter((lead) => lead.etapa === "cotizacion")
      .reduce((total, lead) => {
        const monto =
          lead.monto_negociado_desarrollo ??
          lead.monto_propuesto_desarrollo ??
          0;

        return total + Number(monto);
      }, 0);

    const historicoVentas = historicalMonths.map((month) => {
      const monthLeads = leads.filter((lead) => {
        if (lead.etapa !== "ganado") {
          return false;
        }

        const conversionDate = salesByLeadId.get(lead.id) ?? lead.updated_at;
        const current = new Date(conversionDate);

        return (
          current.getUTCFullYear() === month.date.getUTCFullYear() &&
          current.getUTCMonth() === month.date.getUTCMonth()
        );
      });

      return {
        mes: month.mes,
        cantidad_ventas: monthLeads.length,
        monto_total_usd: monthLeads.reduce((total, lead) => {
          const monto =
            lead.monto_negociado_desarrollo ??
            lead.monto_propuesto_desarrollo ??
            0;

          return total + Number(monto);
        }, 0)
      };
    });

    const ventasCerradasMes = {
      count: comisionesMes.length,
      monto: comisionesMes.reduce((total, comision) => total + Number(comision.monto_venta ?? 0), 0)
    };

    const comisionPendienteUsd = comisionesTotales
      .filter((comision) => comision.estado === "pendiente")
      .reduce((total, comision) => total + Number(comision.monto_comision ?? 0), 0);

    const comisionPagadaUsd = comisionesTotales
      .filter((comision) => comision.estado === "pagada")
      .reduce((total, comision) => total + Number(comision.monto_comision ?? 0), 0);

    const bono =
      configResult?.bono_monto_usd && configResult.bono_monto_usd > 0
        ? {
            disponible: ventasCerradasMes.monto >= configResult.bono_ventas_mes_umbral,
            monto_usd: configResult.bono_monto_usd,
            umbral_ventas_usd: configResult.bono_ventas_mes_umbral,
            ventas_mes_usd: ventasCerradasMes.monto
          }
        : null;

    return NextResponse.json({
      data: {
        leads_totales: leads.length,
        leads_por_etapa: leadsPorEtapa,
        clientes_convertidos: clientes.length,
        ventas_cerradas_mes: ventasCerradasMes,
        pipeline_potencial_usd: pipelinePotencialUsd,
        historico_ventas: historicoVentas,
        comision_pendiente_usd: comisionPendienteUsd,
        comision_pagada_usd: comisionPagadaUsd,
        bono
      }
    } satisfies MiPanelMetricasResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
