import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Suscripcion } from "@/types/suscripciones";

export const maxDuration = 30;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addOneMonth(dateString: string) {
  const date = new Date(dateString);
  return new Date(date.getFullYear(), date.getMonth() + 1, date.getDate()).toISOString().slice(0, 10);
}

export async function POST() {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const hoy = todayISO();
    const { data: suscripciones, error } = await supabase
      .from("suscripciones")
      .select("*")
      .eq("estado", "activa")
      .lte("proxima_cobro", hoy);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let generados = 0;

    for (const suscripcion of (suscripciones ?? []) as Suscripcion[]) {
      if (suscripcion.monto_mensual <= 0) {
        const nextCobro = addOneMonth(suscripcion.proxima_cobro ?? hoy);
        await supabase.from("suscripciones").update({ proxima_cobro: nextCobro }).eq("id", suscripcion.id);
        continue;
      }

      const existeHoy = await supabase
        .from("cobros")
        .select("id")
        .eq("suscripcion_id", suscripcion.id)
        .eq("tipo", "mantenimiento")
        .eq("fecha_emision", hoy)
        .maybeSingle();

      if (existeHoy.data) {
        const nextCobro = addOneMonth(suscripcion.proxima_cobro ?? hoy);
        await supabase.from("suscripciones").update({ proxima_cobro: nextCobro }).eq("id", suscripcion.id);
        continue;
      }

      const cobroPayload = {
        cliente_id: suscripcion.cliente_id,
        proyecto_id: suscripcion.proyecto_id,
        suscripcion_id: suscripcion.id,
        cotizacion_id: suscripcion.cotizacion_id,
        concepto: "Mantenimiento mensual",
        tipo: "mantenimiento" as const,
        monto: suscripcion.monto_mensual,
        fecha_emision: hoy,
        fecha_vencimiento: hoy,
        estado: "pendiente" as const
      };

      const { error: insertError, data } = await supabase.from("cobros").insert(cobroPayload).select("*").single();
      if (insertError || !data) {
        return NextResponse.json({ error: insertError?.message ?? "No se pudo generar un cobro recurrente" }, { status: 500 });
      }

      generados += 1;
      const nextCobro = addOneMonth(suscripcion.proxima_cobro ?? hoy);
      const { error: updateError } = await supabase
        .from("suscripciones")
        .update({ proxima_cobro: nextCobro })
        .eq("id", suscripcion.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ data: { generados } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
