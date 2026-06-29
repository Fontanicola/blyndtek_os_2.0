import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CreateSuscripcionInput, EstadoSuscripcion, Suscripcion } from "@/types/suscripciones";

function parseEstado(searchParams: URLSearchParams): EstadoSuscripcion | null {
  const estado = searchParams.get("estado");
  if (estado === "pendiente" || estado === "activa" || estado === "pausada" || estado === "baja") {
    return estado;
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const params = request.nextUrl.searchParams;
    const estado = parseEstado(params);
    const clienteId = params.get("cliente_id")?.trim() || null;
    const proyectoId = params.get("proyecto_id")?.trim() || null;
    const cotizacionId = params.get("cotizacion_id")?.trim() || null;

    let query = supabase.from("suscripciones").select("*").order("created_at", { ascending: false });

    if (estado) {
      query = query.eq("estado", estado);
    }

    if (clienteId) {
      query = query.eq("cliente_id", clienteId);
    }

    if (proyectoId) {
      query = query.eq("proyecto_id", proyectoId);
    }

    if (cotizacionId) {
      query = query.eq("cotizacion_id", cotizacionId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: (data ?? []) as Suscripcion[] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as CreateSuscripcionInput;

    if (!body.cliente_id?.trim()) {
      return NextResponse.json({ error: "cliente_id is required" }, { status: 400 });
    }

    if (!body.cotizacion_id?.trim()) {
      return NextResponse.json({ error: "cotizacion_id is required" }, { status: 400 });
    }

    if (!body.tipo) {
      return NextResponse.json({ error: "tipo is required" }, { status: 400 });
    }

    if (typeof body.monto_mensual !== "number" || Number.isNaN(body.monto_mensual) || body.monto_mensual < 0) {
      return NextResponse.json({ error: "monto_mensual must be a valid number" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const payload: CreateSuscripcionInput = {
      ...body,
      proyecto_id: body.proyecto_id ?? null,
      fecha_inicio: body.fecha_inicio ?? null,
      proxima_cobro: body.proxima_cobro ?? null,
      estado: body.estado ?? "pendiente",
      fecha_baja: body.fecha_baja ?? null,
      motivo_baja: body.motivo_baja ?? null
    };

    const { data, error } = await supabase
      .from("suscripciones")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data as Suscripcion }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
