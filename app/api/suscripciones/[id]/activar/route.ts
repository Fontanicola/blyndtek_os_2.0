import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Cobro } from "@/types/cobros";
import type { Suscripcion } from "@/types/suscripciones";

type RouteContext = {
  params: {
    id: string;
  };
};

function addOneMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const today = new Date();
    const fechaInicio = today.toISOString().slice(0, 10);
    const proximaCobro = addOneMonth(today).toISOString().slice(0, 10);

    const { data: suscripcion, error: suscripcionError } = await supabase
      .from("suscripciones")
      .select("*")
      .eq("id", context.params.id)
      .single();

    if (suscripcionError || !suscripcion) {
      return NextResponse.json({ error: suscripcionError?.message ?? "Suscripción no encontrada" }, { status: 404 });
    }

    const actual = suscripcion as Suscripcion;

    if (actual.estado !== "pendiente") {
      return NextResponse.json({ error: "La suscripción debe estar en estado pendiente para activarse" }, { status: 400 });
    }

    const { data: updatedSuscripcion, error: updateError } = await supabase
      .from("suscripciones")
      .update({
        fecha_inicio: fechaInicio,
        proxima_cobro: proximaCobro,
        estado: "activa"
      })
      .eq("id", context.params.id)
      .select("*")
      .single();

    if (updateError || !updatedSuscripcion) {
      return NextResponse.json({ error: updateError?.message ?? "No se pudo activar la suscripción" }, { status: 500 });
    }

    let cobroCreado: Cobro | null = null;

    if (actual.monto_mensual > 0) {
      const { data, error: cobroError } = await supabase
        .from("cobros")
        .insert({
          cliente_id: actual.cliente_id,
          proyecto_id: actual.proyecto_id,
          suscripcion_id: actual.id,
          cotizacion_id: actual.cotizacion_id,
          concepto: `Mantenimiento ${actual.tipo}`,
          tipo: "mantenimiento",
          monto: actual.monto_mensual,
          fecha_emision: fechaInicio,
          fecha_vencimiento: fechaInicio,
          estado: "pendiente"
        })
        .select("*")
        .single();

      if (cobroError || !data) {
        await supabase
          .from("suscripciones")
          .update({
            fecha_inicio: null,
            proxima_cobro: null,
            estado: "pendiente"
          })
          .eq("id", context.params.id);
        return NextResponse.json({ error: cobroError?.message ?? "No se pudo generar el primer cobro" }, { status: 500 });
      }

      cobroCreado = data as Cobro;
    }

    return NextResponse.json({
      data: updatedSuscripcion as Suscripcion,
      cobro: cobroCreado
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
