import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { CANAL_ORIGEN_LABELS, isCanalOrigenLead } from "@/lib/leads";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CanalOrigenLead } from "@/types/leads";
import type { MarketingAtribucionPeriod, MarketingAtribucionRow } from "@/types/marketing";

type LeadAtribucionRow = {
  id: string;
  canal_origen: CanalOrigenLead | null;
  campana_origen: string | null;
  etapa: string;
  created_at: string;
};

type ClienteAtribucionRow = {
  id: string;
  lead_id: string | null;
};

type ContratoAtribucionRow = {
  cliente_id: string | null;
  valor_total: number | null;
  estado: string;
};

type ComisionAtribucionRow = {
  cliente_id: string | null;
  monto_comision: number | null;
  estado: string;
};

const periods: MarketingAtribucionPeriod[] = ["month", "quarter", "year", "todo"];

function parsePeriod(value: string | null): MarketingAtribucionPeriod {
  return periods.includes(value as MarketingAtribucionPeriod)
    ? (value as MarketingAtribucionPeriod)
    : "month";
}

function getPeriodStart(period: MarketingAtribucionPeriod) {
  if (period === "todo") {
    return null;
  }

  const now = new Date();

  if (period === "year") {
    return new Date(now.getFullYear(), 0, 1);
  }

  if (period === "quarter") {
    return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  }

  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function normalizeCanalOrigen(value: CanalOrigenLead | null): CanalOrigenLead {
  return isCanalOrigenLead(value) ? value : "organico";
}

function buildGroupKey(canal: CanalOrigenLead, campana: string | null) {
  return `${canal}::${campana ?? ""}`;
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    if (currentUser.rol !== "admin") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const period = parsePeriod(request.nextUrl.searchParams.get("period"));
    const periodStart = getPeriodStart(period);
    const supabase = createAdminClient();

    let leadsQuery = supabase
      .from("leads")
      .select("id, canal_origen, campana_origen, etapa, created_at")
      .order("created_at", { ascending: false });

    if (periodStart) {
      leadsQuery = leadsQuery.gte("created_at", periodStart.toISOString());
    }

    const { data: leadsData, error: leadsError } = await leadsQuery;

    if (leadsError) {
      return NextResponse.json({ error: leadsError.message }, { status: 500 });
    }

    const leads = (leadsData ?? []) as LeadAtribucionRow[];
    const leadIds = leads.map((lead) => lead.id);

    const [clientesResult, contratosResult, comisionesResult] = await Promise.all([
      leadIds.length > 0
        ? supabase.from("clientes").select("id, lead_id").in("lead_id", leadIds)
        : Promise.resolve({ data: [], error: null }),
      supabase.from("contratos").select("cliente_id, valor_total, estado").eq("estado", "activo"),
      supabase.from("comisiones").select("cliente_id, monto_comision, estado").eq("estado", "pagada")
    ]);

    if (clientesResult.error) {
      return NextResponse.json({ error: clientesResult.error.message }, { status: 500 });
    }

    if (contratosResult.error) {
      return NextResponse.json({ error: contratosResult.error.message }, { status: 500 });
    }

    if (comisionesResult.error) {
      return NextResponse.json({ error: comisionesResult.error.message }, { status: 500 });
    }

    const clientes = (clientesResult.data ?? []) as ClienteAtribucionRow[];
    const contratos = (contratosResult.data ?? []) as ContratoAtribucionRow[];
    const comisiones = (comisionesResult.data ?? []) as ComisionAtribucionRow[];
    const clientesByLeadId = new Map<string, ClienteAtribucionRow[]>();

    for (const cliente of clientes) {
      if (!cliente.lead_id) {
        continue;
      }

      const current = clientesByLeadId.get(cliente.lead_id) ?? [];
      current.push(cliente);
      clientesByLeadId.set(cliente.lead_id, current);
    }

    const ingresosByClienteId = new Map<string, number>();
    for (const contrato of contratos) {
      if (!contrato.cliente_id) {
        continue;
      }

      ingresosByClienteId.set(
        contrato.cliente_id,
        (ingresosByClienteId.get(contrato.cliente_id) ?? 0) + Number(contrato.valor_total ?? 0)
      );
    }

    const comisionesByClienteId = new Map<string, number>();
    for (const comision of comisiones) {
      if (!comision.cliente_id) {
        continue;
      }

      comisionesByClienteId.set(
        comision.cliente_id,
        (comisionesByClienteId.get(comision.cliente_id) ?? 0) + Number(comision.monto_comision ?? 0)
      );
    }

    const groups = new Map<string, MarketingAtribucionRow>();

    for (const lead of leads) {
      const canal = normalizeCanalOrigen(lead.canal_origen);
      const campana = lead.campana_origen?.trim() || null;
      const key = buildGroupKey(canal, campana);
      const current =
        groups.get(key) ??
        ({
          canal_origen: canal,
          canal_label: CANAL_ORIGEN_LABELS[canal],
          campana_origen: campana,
          leads_generados: 0,
          clientes_convertidos: 0,
          tasa_conversion_pct: 0,
          ingreso_generado_usd: 0,
          comision_pagada_usd: 0
        } satisfies MarketingAtribucionRow);

      const clientesConvertidos = clientesByLeadId.get(lead.id) ?? [];
      current.leads_generados += 1;

      if (lead.etapa === "ganado") {
        current.clientes_convertidos += clientesConvertidos.length || 1;
      }

      for (const cliente of clientesConvertidos) {
        current.ingreso_generado_usd += ingresosByClienteId.get(cliente.id) ?? 0;
        current.comision_pagada_usd += comisionesByClienteId.get(cliente.id) ?? 0;
      }

      current.tasa_conversion_pct =
        current.leads_generados > 0
          ? (current.clientes_convertidos / current.leads_generados) * 100
          : 0;

      groups.set(key, current);
    }

    const rows = [...groups.values()].sort((first, second) => {
      return second.ingreso_generado_usd - first.ingreso_generado_usd;
    });

    return NextResponse.json({ data: rows, period });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

