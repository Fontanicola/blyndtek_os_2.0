import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CreateProductoFeatureInput, ProductoFeature, EstadoFeatureProducto } from "@/types/productos";

type RouteContext = {
  params: {
    id: string;
  };
};

const estadosValidos: EstadoFeatureProducto[] = ["idea", "planificado", "en_desarrollo", "lanzado"];
const prioridadesValidas = ["alta", "media", "baja"] as const;

function normalizeEstado(value: unknown): EstadoFeatureProducto {
  if (typeof value === "string" && estadosValidos.includes(value as EstadoFeatureProducto)) {
    return value as EstadoFeatureProducto;
  }

  return "idea";
}

function normalizePrioridad(value: unknown) {
  if (typeof value === "string" && prioridadesValidas.includes(value as (typeof prioridadesValidas)[number])) {
    return value as (typeof prioridadesValidas)[number];
  }

  return "media";
}

function normalizeNullableString(value: unknown) {
  if (typeof value === "undefined") {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const next = value.trim();
  return next ? next : null;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("producto_features")
      .select("*")
      .eq("producto_id", params.id)
      .order("orden", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: (data ?? []) as ProductoFeature[] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as CreateProductoFeatureInput;
    const titulo = body.titulo?.trim() ?? "";

    if (!titulo) {
      return NextResponse.json({ error: "titulo is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: lastFeature, error: lastFeatureError } = await supabase
      .from("producto_features")
      .select("orden")
      .eq("producto_id", params.id)
      .order("orden", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastFeatureError) {
      return NextResponse.json({ error: lastFeatureError.message }, { status: 500 });
    }

    const { data, error } = await supabase
      .from("producto_features")
      .insert({
        producto_id: params.id,
        titulo,
        descripcion: normalizeNullableString(body.descripcion) ?? null,
        estado: normalizeEstado(body.estado),
        prioridad: normalizePrioridad(body.prioridad),
        solicitado_por_cliente_id: normalizeNullableString(body.solicitado_por_cliente_id) ?? null,
        orden: typeof body.orden === "number" ? body.orden : Number(lastFeature?.orden ?? 0) + 1
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data as ProductoFeature }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
