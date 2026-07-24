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
};

type DiagnosticoConLead = Diagnostico & {
  lead?: {
    id: string;
    vendedor_id: string | null;
  } | null;
};

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

    if (Number.isNaN(precioDesarrollo) || precioDesarrollo < 0 || Number.isNaN(precioMensual) || precioMensual < 0) {
      return NextResponse.json({ error: "Los precios deben ser números positivos." }, { status: 400 });
    }

    const { data: updatedDiagnostico, error: updateError } = await supabase
      .from("diagnosticos")
      .update({
        precio_ideal_desarrollo: precioDesarrollo,
        precio_ideal_mensual: precioMensual,
        precio_minimo_mensual: precioMensual
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
