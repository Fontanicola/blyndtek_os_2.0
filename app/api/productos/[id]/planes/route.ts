import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CreateProductoPlanInput, ProductoPlan } from "@/types/productoPlanes";

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
    const { data: producto, error: productoError } = await supabase.from("productos").select("id").eq("id", params.id).maybeSingle();

    if (productoError) {
      return NextResponse.json({ error: productoError.message }, { status: 500 });
    }

    if (!producto) {
      return NextResponse.json({ error: "Producto not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("producto_planes")
      .select("*")
      .eq("producto_id", params.id)
      .order("orden", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: (data ?? []) as ProductoPlan[] });
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

    const body = (await request.json()) as CreateProductoPlanInput;
    const nombre = body.nombre?.trim() ?? "";

    if (!nombre) {
      return NextResponse.json({ error: "nombre is required" }, { status: 400 });
    }

    if (typeof body.precio_mensual !== "number" || Number.isNaN(body.precio_mensual) || body.precio_mensual < 0) {
      return NextResponse.json({ error: "precio_mensual must be a valid number" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: producto, error: productoError } = await supabase.from("productos").select("id").eq("id", params.id).maybeSingle();

    if (productoError) {
      return NextResponse.json({ error: productoError.message }, { status: 500 });
    }

    if (!producto) {
      return NextResponse.json({ error: "Producto not found" }, { status: 404 });
    }

    const { data: lastPlan, error: lastPlanError } = await supabase
      .from("producto_planes")
      .select("orden")
      .eq("producto_id", params.id)
      .order("orden", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastPlanError) {
      return NextResponse.json({ error: lastPlanError.message }, { status: 500 });
    }

    const { data, error } = await supabase
      .from("producto_planes")
      .insert({
        producto_id: params.id,
        nombre,
        precio_mensual: body.precio_mensual,
        descripcion: normalizeNullableString(body.descripcion) ?? null,
        orden: typeof body.orden === "number" ? body.orden : Number(lastPlan?.orden ?? 0) + 1
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data as ProductoPlan }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
