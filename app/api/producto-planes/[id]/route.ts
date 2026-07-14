import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProductoPlan, UpdateProductoPlanInput } from "@/types/productoPlanes";

type RouteContext = {
  params: {
    id: string;
  };
};

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

    const body = (await request.json()) as UpdateProductoPlanInput;
    const payload: UpdateProductoPlanInput = {};

    if (typeof body.nombre === "string") {
      const nombre = body.nombre.trim();
      if (!nombre) {
        return NextResponse.json({ error: "nombre is required" }, { status: 400 });
      }
      payload.nombre = nombre;
    }

    if (typeof body.precio_mensual === "number") {
      if (Number.isNaN(body.precio_mensual) || body.precio_mensual < 0) {
        return NextResponse.json({ error: "precio_mensual must be a valid number" }, { status: 400 });
      }
      payload.precio_mensual = body.precio_mensual;
    }

    if (typeof body.descripcion !== "undefined") {
      const descripcion = normalizeNullableString(body.descripcion);
      if (typeof descripcion !== "undefined") {
        payload.descripcion = descripcion;
      }
    }

    if (typeof body.orden === "number") {
      payload.orden = body.orden;
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("producto_planes")
      .update(payload)
      .eq("id", params.id)
      .select("*")
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ data: data as ProductoPlan });
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
    const { error: unlinkError } = await supabase.from("suscripciones").update({ plan_id: null }).eq("plan_id", params.id);

    if (unlinkError) {
      return NextResponse.json({ error: unlinkError.message }, { status: 500 });
    }

    const { error } = await supabase.from("producto_planes").delete().eq("id", params.id);

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
