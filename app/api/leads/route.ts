import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { calcularComision } from "@/lib/comisiones/calcular";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CanalLead, CreateLeadInput, EtapaLead, Lead, NivelConfianza } from "@/types/leads";
import type { ConfigComisiones } from "@/types/comisiones";

type LeadRow = Lead & {
  vendedor?: { nombre?: string | null } | null;
};

async function getActiveConfig(supabase: ReturnType<typeof createAdminClient>) {
  const { data, error } = await supabase
    .from("config_comisiones")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return (data?.[0] ?? null) as ConfigComisiones | null;
}

function getLeadMontoVenta(lead: Lead) {
  const desarrollo =
    lead.monto_negociado_desarrollo ?? lead.monto_propuesto_desarrollo ?? lead.valor_estimado ?? null;
  const mensual = lead.monto_negociado_mensual ?? lead.monto_propuesto_mensual ?? null;

  if (desarrollo === null && mensual === null) {
    return null;
  }

  return Number((desarrollo ?? 0) + (mensual ?? 0));
}

function buildLeadFilters(searchParams: URLSearchParams) {
  const canal = searchParams.get("canal");
  const etapa = searchParams.get("etapa");
  const responsableId = searchParams.get("responsable_id");
  const rubro = searchParams.get("rubro");
  const ubicacion = searchParams.get("ubicacion");
  const nivelConfianza = searchParams.get("nivel_confianza");

  return {
    canal: (canal?.trim() as CanalLead | "") || "outbound",
    etapa: (etapa?.trim() as EtapaLead | "") || null,
    responsableId: responsableId?.trim() || null,
    rubro: rubro?.trim() || null,
    ubicacion: ubicacion?.trim() || null,
    nivelConfianza: (nivelConfianza?.trim() as NivelConfianza | "") || null
  };
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const activeConfig = await getActiveConfig(supabase).catch(() => null);
    const { canal, etapa, responsableId, rubro, ubicacion, nivelConfianza } = buildLeadFilters(
      request.nextUrl.searchParams
    );

    let query = supabase
      .from("leads")
      .select("*, vendedor:usuarios!leads_vendedor_id_fkey(nombre)")
      .eq("canal", canal)
      .order("updated_at", { ascending: false });

    if (currentUser.rol === "comercial") {
      query = query.eq("vendedor_id", currentUser.id);
    } else if (currentUser.rol !== "admin") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    if (etapa) {
      query = query.eq("etapa", etapa);
    }

    if (responsableId) {
      query = query.eq("responsable_id", responsableId);
    }

    if (rubro) {
      query = query.eq("rubro", rubro);
    }

    if (ubicacion) {
      query = query.eq("ubicacion", ubicacion);
    }

    if (nivelConfianza) {
      query = query.eq("nivel_confianza", nivelConfianza);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const leads = (data ?? []).map((row) => {
      const leadRow = row as LeadRow;
      const montoVenta = getLeadMontoVenta(leadRow);
      const comision =
        montoVenta !== null && activeConfig ? calcularComision(montoVenta, activeConfig) : null;

      return {
        ...(leadRow as Lead),
        vendedor_nombre: leadRow.vendedor?.nombre ?? null,
        comision_estimada_usd: comision?.montoComision ?? null,
        comision_estimada_pct: comision?.porcentaje ?? null
      } satisfies Lead;
    });

    return NextResponse.json({ data: leads });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateLeadInput;
    const canal = body.canal;
    const currentUser = await getCurrentUser();

    if (!body.empresa?.trim()) {
      return NextResponse.json({ error: "Empresa is required" }, { status: 400 });
    }

    if (canal !== "outbound" && canal !== "inbound") {
      return NextResponse.json({ error: "Invalid canal" }, { status: 400 });
    }

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    if (currentUser.rol !== "admin" && currentUser.rol !== "comercial") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const supabase = createAdminClient();
    const payload: CreateLeadInput = {
      ...body,
      canal,
      vendedor_id: currentUser.rol === "comercial" ? currentUser.id : body.vendedor_id ?? null
    };

    const { data, error } = await supabase
      .from("leads")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data as Lead }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
