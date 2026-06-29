import { createAdminClient, addMonthsISO, todayISO, toIsoAtHour } from "../_shared/supabase.ts";

type SuscripcionRow = {
  id: string;
  cliente_id: string;
  proyecto_id: string | null;
  cotizacion_id: string;
  monto_mensual: number;
  proxima_cobro: string | null;
};

async function getAdminUsuarioId(supabase: ReturnType<typeof createAdminClient>) {
  const { data } = await supabase
    .from("usuarios")
    .select("id")
    .eq("rol", "admin")
    .eq("activo", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

Deno.serve(async () => {
  try {
    const supabase = createAdminClient();
    const hoy = todayISO();
    const adminId = await getAdminUsuarioId(supabase);

    const { data: suscripciones, error } = await supabase
      .from("suscripciones")
      .select("id, cliente_id, proyecto_id, cotizacion_id, monto_mensual, proxima_cobro, estado")
      .eq("estado", "activa")
      .lte("proxima_cobro", hoy);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    let cobrosGenerados = 0;
    let recordatoriosGenerados = 0;
    let suscripcionesActualizadas = 0;

    for (const suscripcion of (suscripciones ?? []) as Array<SuscripcionRow & { estado: string }>) {
      const nextCobro = addMonthsISO(suscripcion.proxima_cobro ?? hoy, 1);

      if (suscripcion.monto_mensual <= 0) {
        const { error: updateError } = await supabase
          .from("suscripciones")
          .update({ proxima_cobro: nextCobro })
          .eq("id", suscripcion.id);

        if (updateError) {
          return Response.json({ error: updateError.message }, { status: 500 });
        }

        suscripcionesActualizadas += 1;
        continue;
      }

      const { data: cobroExistente, error: cobroExistenteError } = await supabase
        .from("cobros")
        .select("id")
        .eq("suscripcion_id", suscripcion.id)
        .eq("tipo", "mantenimiento")
        .eq("fecha_emision", hoy)
        .maybeSingle();

      if (cobroExistenteError) {
        return Response.json({ error: cobroExistenteError.message }, { status: 500 });
      }

      let cobroId = cobroExistente?.id ?? null;

      if (!cobroId) {
        const { data: cobroCreado, error: cobroError } = await supabase
          .from("cobros")
          .insert({
            cliente_id: suscripcion.cliente_id,
            proyecto_id: suscripcion.proyecto_id,
            suscripcion_id: suscripcion.id,
            cotizacion_id: suscripcion.cotizacion_id,
            concepto: "Mantenimiento mensual",
            tipo: "mantenimiento",
            monto: suscripcion.monto_mensual,
            fecha_emision: hoy,
            fecha_vencimiento: hoy,
            estado: "pendiente"
          })
          .select("id")
          .single();

        if (cobroError) {
          return Response.json({ error: cobroError.message }, { status: 500 });
        }

        cobroId = cobroCreado.id;
        cobrosGenerados += 1;
      }

      if (adminId && cobroId) {
        const { data: recordatorioExistente, error: recordatorioError } = await supabase
          .from("eventos")
          .select("id")
          .eq("referencia_tipo", "cobro")
          .eq("referencia_id", cobroId)
          .eq("tipo", "vencimiento")
          .maybeSingle();

        if (recordatorioError) {
          return Response.json({ error: recordatorioError.message }, { status: 500 });
        }

        if (!recordatorioExistente) {
          const { error: eventoError } = await supabase.from("eventos").insert({
            titulo: "Recordatorio de cobro de mantenimiento",
            fecha_inicio: toIsoAtHour(hoy, 9, 0),
            fecha_fin: toIsoAtHour(hoy, 9, 30),
            tipo: "vencimiento",
            usuario_id: adminId,
            referencia_tipo: "cobro",
            referencia_id: cobroId,
            google_event_id: null
          });

          if (eventoError) {
            return Response.json({ error: eventoError.message }, { status: 500 });
          }

          recordatoriosGenerados += 1;
        }
      }

      const { error: updateError } = await supabase
        .from("suscripciones")
        .update({ proxima_cobro: nextCobro })
        .eq("id", suscripcion.id);

      if (updateError) {
        return Response.json({ error: updateError.message }, { status: 500 });
      }

      suscripcionesActualizadas += 1;
    }

    return Response.json({
      data: {
        generados: cobrosGenerados,
        recordatorios: recordatoriosGenerados,
        suscripciones_actualizadas: suscripcionesActualizadas
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
});
