import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CanalLead, CreateLeadInput, EtapaLead, Lead, NivelConfianza } from "@/types/leads";

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
    const supabase = createAdminClient();
    const { canal, etapa, responsableId, rubro, ubicacion, nivelConfianza } = buildLeadFilters(
      request.nextUrl.searchParams
    );

    let query = supabase
      .from("leads")
      .select("*")
      .eq("canal", canal)
      .order("updated_at", { ascending: false });

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

    return NextResponse.json({ data: (data ?? []) as Lead[] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateLeadInput;
    const canal = body.canal;

    if (!body.empresa?.trim()) {
      return NextResponse.json({ error: "Empresa is required" }, { status: 400 });
    }

    if (canal !== "outbound" && canal !== "inbound") {
      return NextResponse.json({ error: "Invalid canal" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const payload: CreateLeadInput = {
      ...body,
      canal
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
