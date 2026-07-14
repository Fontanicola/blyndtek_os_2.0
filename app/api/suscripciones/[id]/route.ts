import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Suscripcion, UpdateSuscripcionInput } from "@/types/suscripciones";

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

async function resolvePlan(
  supabase: ReturnType<typeof createAdminClient>,
  productoId: string | null | undefined,
  planId: string | null | undefined
) {
  if (!planId) {
    return {
      productoId: productoId ?? null,
      planId: null,
      montoMensual: undefined as number | undefined
    };
  }

  const { data: plan, error } = await supabase
    .from("producto_planes")
    .select("id, producto_id, precio_mensual")
    .eq("id", planId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!plan) {
    throw new Error("plan_id is invalid");
  }

  if (productoId && plan.producto_id !== productoId) {
    throw new Error("plan_id does not belong to the selected producto_id");
  }

  return {
    productoId: plan.producto_id,
    planId: plan.id,
    montoMensual: plan.precio_mensual
  };
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.from("suscripciones").select("*").eq("id", context.params.id).single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ data: data as Suscripcion });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as UpdateSuscripcionInput;
    const supabase = createAdminClient();
    const payload: UpdateSuscripcionInput = { ...body };

    if (typeof body.cotizacion_id !== "undefined") {
      const cotizacionId = normalizeNullableString(body.cotizacion_id);
      if (typeof cotizacionId !== "undefined") {
        payload.cotizacion_id = cotizacionId;
      }
    }

    if (typeof body.proyecto_id !== "undefined") {
      const proyectoId = normalizeNullableString(body.proyecto_id);
      if (typeof proyectoId !== "undefined") {
        payload.proyecto_id = proyectoId;
      }
    }

    let resolvedPlan: { productoId: string | null; planId: string | null; montoMensual?: number } | null = null;

    try {
      resolvedPlan = await resolvePlan(supabase, payload.producto_id ?? null, payload.plan_id ?? null);
    } catch (resolveError) {
      return NextResponse.json(
        { error: resolveError instanceof Error ? resolveError.message : "plan_id is invalid" },
        { status: 400 }
      );
    }

    const resolvedPlanValue = resolvedPlan;

    if (typeof payload.plan_id !== "undefined" && resolvedPlanValue?.planId) {
      payload.plan_id = resolvedPlanValue.planId;
      payload.producto_id = resolvedPlanValue.productoId;
      if (typeof payload.monto_mensual !== "number") {
        payload.monto_mensual = resolvedPlanValue.montoMensual;
      }
    }

    if (typeof payload.producto_id !== "undefined" && !payload.plan_id && resolvedPlanValue?.productoId) {
      payload.producto_id = resolvedPlanValue.productoId;
    }

    if (typeof payload.monto_mensual !== "undefined" && (typeof payload.monto_mensual !== "number" || Number.isNaN(payload.monto_mensual) || payload.monto_mensual < 0)) {
      return NextResponse.json({ error: "monto_mensual must be a valid number" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("suscripciones")
      .update(payload)
      .eq("id", context.params.id)
      .select("*")
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ data: data as Suscripcion });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("suscripciones").delete().eq("id", context.params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
