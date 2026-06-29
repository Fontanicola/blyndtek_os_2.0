import { NextRequest, NextResponse } from "next/server";
import {
  CONDICIONES_COMERCIALES_DEFAULT,
  SUPUESTOS_DEFAULT,
  createDatosPropuestaDefault
} from "@/lib/cotizador/defaults";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCotizacionDraft } from "@/lib/cotizaciones";
import type {
  Cotizacion,
  CreateCotizacionInput,
  EstadoCotizacion
} from "@/types/cotizaciones";

type CotizacionFilters = {
  estado: EstadoCotizacion | null;
  leadId: string | null;
  clienteId: string | null;
};

function parseFilters(searchParams: URLSearchParams): CotizacionFilters {
  const estado = searchParams.get("estado");
  const leadId = searchParams.get("lead_id");
  const clienteId = searchParams.get("cliente_id");

  return {
    estado:
      estado === "borrador" ||
      estado === "enviada" ||
      estado === "aceptada" ||
      estado === "rechazada"
        ? estado
        : null,
    leadId: leadId?.trim() || null,
    clienteId: clienteId?.trim() || null
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { estado, leadId, clienteId } = parseFilters(request.nextUrl.searchParams);

    let query = supabase
      .from("cotizaciones")
      .select("*")
      .order("updated_at", { ascending: false });

    if (estado) {
      query = query.eq("estado", estado);
    }

    if (leadId) {
      query = query.eq("lead_id", leadId);
    }

    if (clienteId) {
      query = query.eq("cliente_id", clienteId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: (data ?? []) as Cotizacion[] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateCotizacionInput;

    if (!body.empresa?.trim()) {
      return NextResponse.json({ error: "Empresa is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const draft = createCotizacionDraft({
      ...body,
      empresa: body.empresa.trim()
    });

    const { data, error } = await supabase
      .from("cotizaciones")
      .insert({
        lead_id: draft.lead_id ?? null,
        cliente_id: draft.cliente_id ?? null,
        empresa: draft.empresa,
        precio_total: draft.precio_total ?? null,
        mantenimiento_mensual: draft.mantenimiento_mensual ?? null,
        plazo_semanas: draft.plazo_semanas ?? null,
        hitos: draft.hitos ?? [],
        modulos: [],
        contexto_chat: [],
        adjuntos: [],
        entendimiento: null,
        beneficios: [],
        por_que_nosotros: [],
        justificacion_precio: null,
        mantenimiento_detalle: null,
        supuestos: [...SUPUESTOS_DEFAULT],
        condiciones_comerciales: [...CONDICIONES_COMERCIALES_DEFAULT],
        datos_propuesta: createDatosPropuestaDefault(draft.empresa),
        resumen_ejecutivo: null,
        estado: "borrador",
        pdf_propuesta_url: null,
        pdf_roadmap_url: null
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data as Cotizacion }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
