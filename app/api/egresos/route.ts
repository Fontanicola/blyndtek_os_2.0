import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CreateEgresoInput, Egreso, CategoriaEgreso } from "@/types/egresos";

function parseCategoria(searchParams: URLSearchParams): CategoriaEgreso | null {
  const categoria = searchParams.get("categoria");
  if (
    categoria === "sueldos" ||
    categoria === "pauta" ||
    categoria === "fijos" ||
    categoria === "dev" ||
    categoria === "otro"
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
    const payload: CreateEgresoInput = {
      ...body,
      concepto: body.concepto.trim(),
      notas: body.notas ?? null,
      recurrente: body.recurrente ?? false
    };

    const { data, error } = await supabase.from("egresos").insert(payload).select("*").single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data as Egreso }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
