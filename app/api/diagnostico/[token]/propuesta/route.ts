import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Diagnostico } from "@/types/diagnostico";

type RouteContext = {
  params: {
    token: string;
  };
};

type PropuestaPatchBody = {
  empresa?: string;
  precio_ideal_desarrollo?: number;
  precio_ideal_mensual?: number;
  adelanto_pct?: number;
  fecha_adelanto?: string | null;
  cantidad_cuotas?: number;
  dia_pago?: number;
  fecha_primera_cuota?: string | null;
  dia_facturacion_mantenimiento?: number | null;
};

type DiagnosticoConLead = Diagnostico & {
  lead?: {
    id: string;
    vendedor_id: string | null;
  } | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberInRange(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value ?? fallback);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

function integerInRange(value: unknown, fallback: number, min: number, max: number) {
  return Math.round(numberInRange(value, fallback, min, max));
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numericFallback(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const body = (await request.json()) as PropuestaPatchBody;
    const supabase = createAdminClient();
    const { data: diagnostico, error: diagnosticoError } = await supabase
      .from("diagnosticos")
      .select("*, lead:leads(id, vendedor_id)")
      .eq("token_publico", params.token.trim())
      .maybeSingle<DiagnosticoConLead>();

    if (diagnosticoError) {
      return NextResponse.json({ error: diagnosticoError.message }, { status: 500 });
    }

    if (!diagnostico) {
      return NextResponse.json({ error: "Diagnóstico no encontrado." }, { status: 404 });
    }

    if (
      currentUser.rol !== "admin" &&
      (currentUser.rol !== "comercial" || diagnostico.lead?.vendedor_id !== currentUser.id)
    ) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const precioDesarrollo = Number(body.precio_ideal_desarrollo ?? diagnostico.precio_ideal_desarrollo ?? 0);
    const precioMensual = Number(body.precio_ideal_mensual ?? diagnostico.precio_ideal_mensual ?? 0);
    const modulosSugeridos = isRecord(diagnostico.modulos_sugeridos) ? diagnostico.modulos_sugeridos : {};
    const condicionesPrevias = isRecord(modulosSugeridos.condiciones_comerciales)
      ? modulosSugeridos.condiciones_comerciales
      : {};
    const adelantoPct = numberInRange(
      body.adelanto_pct,
      numericFallback(condicionesPrevias.adelanto_pct, 25),
      0,
      100
    );
    const cantidadCuotas = integerInRange(
      body.cantidad_cuotas,
      numericFallback(condicionesPrevias.cantidad_cuotas, 1),
      1,
      48
    );
    const diaPago = integerInRange(body.dia_pago, numericFallback(condicionesPrevias.dia_pago, 10), 1, 28);
    const diaFacturacionMantenimiento =
      precioMensual > 0
        ? integerInRange(
            body.dia_facturacion_mantenimiento,
            numericFallback(condicionesPrevias.dia_facturacion_mantenimiento, diaPago),
            1,
            28
          )
        : null;

    if (Number.isNaN(precioDesarrollo) || precioDesarrollo < 0 || Number.isNaN(precioMensual) || precioMensual < 0) {
      return NextResponse.json({ error: "Los precios deben ser números positivos." }, { status: 400 });
    }

    const condicionesComerciales = {
      precio_desarrollo_usd: precioDesarrollo,
      adelanto_pct: adelantoPct,
      fecha_adelanto: body.fecha_adelanto?.trim() || stringOrNull(condicionesPrevias.fecha_adelanto),
      cantidad_cuotas: cantidadCuotas,
      dia_pago: diaPago,
      fecha_primera_cuota: body.fecha_primera_cuota?.trim() || stringOrNull(condicionesPrevias.fecha_primera_cuota),
      mantenimiento_mensual_usd: precioMensual,
      dia_facturacion_mantenimiento: diaFacturacionMantenimiento
    };

    const { data: updatedDiagnostico, error: updateError } = await supabase
      .from("diagnosticos")
      .update({
        precio_ideal_desarrollo: precioDesarrollo,
        precio_ideal_mensual: precioMensual,
        precio_minimo_mensual: precioMensual,
        modulos_sugeridos: {
          ...modulosSugeridos,
          condiciones_comerciales: condicionesComerciales
        }
      })
      .eq("id", diagnostico.id)
      .select("*")
      .single();

    if (updateError || !updatedDiagnostico) {
      return NextResponse.json(
        { error: updateError?.message ?? "No se pudo guardar la propuesta." },
        { status: 500 }
      );
    }

    if (diagnostico.lead?.id) {
      const { error: leadError } = await supabase
        .from("leads")
        .update({
          ...(body.empresa?.trim() ? { empresa: body.empresa.trim() } : {}),
          monto_propuesto_desarrollo: precioDesarrollo,
          monto_propuesto_mensual: precioMensual > 0 ? precioMensual : null
        })
        .eq("id", diagnostico.lead.id);

      if (leadError) {
        return NextResponse.json({ error: leadError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      data: {
        diagnostico: updatedDiagnostico as Diagnostico,
        empresa: body.empresa?.trim() ?? null
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
