import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EstadoFeatureProducto, ProductoFeature, UpdateProductoFeatureInput } from "@/types/productos";

type RouteContext = {
  params: {
    id: string;
  };
};

const estadosValidos: EstadoFeatureProducto[] = ["idea", "planificado", "en_desarrollo", "lanzado"];
const prioridadesValidas = ["alta", "media", "baja"] as const;

function normalizeNullableString(value: unknown) {
  if (typeof value === "undefined") {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const next = value.trim();
  return next ? next : null;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as UpdateProductoFeatureInput;
    const payload: UpdateProductoFeatureInput = {};

    if (typeof body.titulo === "string") {
      const titulo = body.titulo.trim();
      if (!titulo) {
        return NextResponse.json({ error: "titulo is required" }, { status: 400 });
      }
      payload.titulo = titulo;
    }

    if (typeof body.descripcion !== "undefined") {
      const descripcion = normalizeNullableString(body.descripcion);
      if (typeof descripcion !== "undefined") {
        payload.descripcion = descripcion;
      }
    }

    if (typeof body.estado === "string") {
      if (!estadosValidos.includes(body.estado as EstadoFeatureProducto)) {
        return NextResponse.json({ error: "estado is invalid" }, { status: 400 });
      }

      payload.estado = body.estado;
    }

    if (typeof body.prioridad === "string") {
      if (!prioridadesValidas.includes(body.prioridad as (typeof prioridadesValidas)[number])) {
        return NextResponse.json({ error: "prioridad is invalid" }, { status: 400 });
      }

      payload.prioridad = body.prioridad;
    }

    if (typeof body.solicitado_por_cliente_id !== "undefined") {
      const solicitadoPorClienteId = normalizeNullableString(body.solicitado_por_cliente_id);
      if (typeof solicitadoPorClienteId !== "undefined") {
        payload.solicitado_por_cliente_id = solicitadoPorClienteId;
      }
    }

    if (typeof body.orden === "number") {
      payload.orden = body.orden;
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("producto_features")
      .update(payload)
      .eq("id", params.id)
      .select("*")
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ data: data as ProductoFeature });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("producto_features").delete().eq("id", params.id);

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
