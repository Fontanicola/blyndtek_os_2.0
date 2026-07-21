import { NextRequest, NextResponse } from "next/server";
import { normalizeCajaSlug } from "@/lib/cajas";
import { getAdminUser } from "@/lib/require-admin";
import { createRecurrenteConfig } from "@/lib/finanzas/egresosRecurrentes";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CreateEgresoInput, Egreso, CategoriaEgreso } from "@/types/egresos";

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

function parseCategoria(searchParams: URLSearchParams): CategoriaEgreso | null {
  const categoria = searchParams.get("categoria");
  if (
    categoria === "dominios" ||
    categoria === "hosting_infraestructura" ||
    categoria === "herramientas_software" ||
    categoria === "marketing_ads" ||
    categoria === "impuestos_contable" ||
    categoria === "sueldos_honorarios" ||
    categoria === "comisiones" ||
    categoria === "otro" ||
    categoria === "transferencia"
  ) {
    return categoria;
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
    const categoria = parseCategoria(params);
    const fechaDesde = params.get("fecha_desde")?.trim() || null;
    const fechaHasta = params.get("fecha_hasta")?.trim() || null;

    let query = supabase.from("egresos").select("*").order("fecha", { ascending: false });

    if (categoria) {
      query = query.eq("categoria", categoria);
    }

    if (fechaDesde) {
      query = query.gte("fecha", fechaDesde);
    }

    if (fechaHasta) {
      query = query.lte("fecha", fechaHasta);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: (data ?? []) as Egreso[] });
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

    const body = (await request.json()) as CreateEgresoInput;

    if (!body.concepto?.trim()) {
      return NextResponse.json({ error: "concepto is required" }, { status: 400 });
    }

    if (!body.categoria) {
      return NextResponse.json({ error: "categoria is required" }, { status: 400 });
    }

    if (typeof body.monto !== "number" || Number.isNaN(body.monto) || body.monto < 0) {
      return NextResponse.json({ error: "monto must be a valid number" }, { status: 400 });
    }

    if (!body.fecha?.trim()) {
      return NextResponse.json({ error: "fecha is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const cajaSelection = await resolveCajaSelection(supabase, body.caja_id ?? null, body.cuenta_medio ?? null);
    const payload: CreateEgresoInput = {
      ...body,
      concepto: body.concepto.trim(),
      caja_id: cajaSelection.caja_id,
      cuenta_medio: cajaSelection.cuenta_medio,
      pagado: body.pagado ?? false,
      fecha_pago: body.pagado ? body.fecha_pago ?? null : null,
      proyecto_id: body.proyecto_id ?? null,
      notas: body.notas ?? null,
      recurrente: body.recurrente ?? false
    };

    if (payload.recurrente && payload.categoria === "transferencia") {
      return NextResponse.json(
        { error: "transferencia is not a valid categoria for recurrente config" },
        { status: 400 }
      );
    }

    let recurrenteConfigId = payload.recurrente_config_id ?? null;
    if (payload.recurrente && !recurrenteConfigId) {
      const categoriaRecurrente = payload.categoria as Exclude<CategoriaEgreso, "transferencia">;
      const config = await createRecurrenteConfig(supabase, {
        concepto: payload.concepto,
        categoria: categoriaRecurrente,
        monto: payload.monto,
        fecha: payload.fecha,
        cliente_id: payload.cliente_id ?? null,
        proyecto_id: payload.proyecto_id ?? null,
        caja_id: payload.caja_id ?? null,
        cuenta_medio: payload.cuenta_medio ?? null
      });
      recurrenteConfigId = config.id;
    }

    const { data, error } = await supabase
      .from("egresos")
      .insert({
        ...payload,
        recurrente_config_id: recurrenteConfigId
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data as Egreso }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
