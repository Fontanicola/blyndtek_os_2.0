import { NextRequest, NextResponse } from "next/server";
import { normalizeCajaSlug } from "@/lib/cajas";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Cobro, CreateCobroInput, EstadoCobro, TipoCobro } from "@/types/cobros";

type ClienteRow = {
  id: string;
  empresa: string;
};

async function resolveCajaSelection(
  supabase: ReturnType<typeof createAdminClient>,
  cajaId: string | null | undefined,
  cuentaMedio: string | null | undefined
) {
  if (cajaId) {
    const { data, error } = await supabase.from("cajas").select("id, slug").eq("id", cajaId).maybeSingle();
    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      return { caja_id: data.id, cuenta_medio: data.slug };
    }
  }

  const normalizedSlug = normalizeCajaSlug(cuentaMedio);
  if (normalizedSlug) {
    const { data, error } = await supabase.from("cajas").select("id, slug").eq("slug", normalizedSlug).maybeSingle();
    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      return { caja_id: data.id, cuenta_medio: data.slug };
    }

    return { caja_id: null, cuenta_medio: normalizedSlug };
  }

  return { caja_id: null, cuenta_medio: null };
}

function parseEstado(searchParams: URLSearchParams): EstadoCobro | null {
  const estado = searchParams.get("estado");
  if (estado === "pendiente" || estado === "facturado" || estado === "cobrado" || estado === "vencido") {
    return estado;
  }
  return null;
}

function parseTipo(searchParams: URLSearchParams): TipoCobro | null {
  const tipo = searchParams.get("tipo");
  if (
    tipo === "one_pay" ||
    tipo === "hito" ||
    tipo === "mantenimiento" ||
    tipo === "brick" ||
    tipo === "diagnostico" ||
    tipo === "otro" ||
    tipo === "transferencia"
  ) {
    return tipo;
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
    const tipo = parseTipo(params);
    const fechaDesde = params.get("fecha_desde")?.trim() || null;
    const fechaHasta = params.get("fecha_hasta")?.trim() || null;
    const clienteId = params.get("cliente_id")?.trim() || null;
    const proyectoId = params.get("proyecto_id")?.trim() || null;
    const suscripcionId = params.get("suscripcion_id")?.trim() || null;
    const cotizacionId = params.get("cotizacion_id")?.trim() || null;

    let query = supabase.from("cobros").select("*").order("fecha_vencimiento", { ascending: true });

    if (estado) {
      query = query.eq("estado", estado);
    }

    if (tipo) {
      query = query.eq("tipo", tipo);
    }

    if (fechaDesde) {
      query = query.gte("fecha_vencimiento", fechaDesde);
    }

    if (fechaHasta) {
      query = query.lte("fecha_vencimiento", fechaHasta);
    }

    if (clienteId) {
      query = query.eq("cliente_id", clienteId);
    }

    if (proyectoId) {
      query = query.eq("proyecto_id", proyectoId);
    }

    if (suscripcionId) {
      query = query.eq("suscripcion_id", suscripcionId);
    }

    if (cotizacionId) {
      query = query.eq("cotizacion_id", cotizacionId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const cobros = (data ?? []) as Cobro[];
    const clienteIds = [...new Set(cobros.map((cobro) => cobro.cliente_id).filter((clienteId): clienteId is string => Boolean(clienteId)))];

    if (clienteIds.length === 0) {
      return NextResponse.json({ data: cobros.map((cobro) => ({ ...cobro, cliente: null })) });
    }

    const { data: clientes, error: clientesError } = await supabase
      .from("clientes")
      .select("id, empresa")
      .in("id", clienteIds)
      .returns<ClienteRow[]>();

    if (clientesError) {
      return NextResponse.json({ error: clientesError.message }, { status: 500 });
    }

    const clientesMap = new Map((clientes ?? []).map((cliente) => [cliente.id, cliente.empresa] as const));

    return NextResponse.json({
      data: cobros.map((cobro) => ({
        ...cobro,
        cliente: cobro.cliente_id
          ? {
              empresa: clientesMap.get(cobro.cliente_id) ?? cobro.cliente_id
            }
          : null
      }))
    });
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

    const body = (await request.json()) as CreateCobroInput;

    const clienteId = body.cliente_id?.trim() || null;
    if (!body.concepto?.trim()) {
      return NextResponse.json({ error: "concepto is required" }, { status: 400 });
    }

    if (!body.tipo) {
      return NextResponse.json({ error: "tipo is required" }, { status: 400 });
    }

    if (!body.fecha_emision?.trim() || !body.fecha_vencimiento?.trim()) {
      return NextResponse.json({ error: "fecha_emision and fecha_vencimiento are required" }, { status: 400 });
    }

    if (typeof body.monto !== "number" || Number.isNaN(body.monto) || body.monto < 0) {
      return NextResponse.json({ error: "monto must be a valid number" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const cajaSelection = await resolveCajaSelection(supabase, body.caja_id ?? null, body.cuenta_medio ?? null);
    const payload = {
      ...body,
      cliente_id: clienteId,
      concepto: body.concepto.trim(),
      estado: body.estado ?? "pendiente",
      tolerancia_dias: body.tolerancia_dias ?? 0,
      proyecto_id: body.proyecto_id ?? null,
      suscripcion_id: body.suscripcion_id ?? null,
      cotizacion_id: body.cotizacion_id ?? null,
      fecha_cobro: body.fecha_cobro ?? null,
      cuenta_medio: cajaSelection.cuenta_medio,
      caja_id: cajaSelection.caja_id
    };

    const { data, error } = await supabase.from("cobros").insert(payload).select("*").single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data as Cobro }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
