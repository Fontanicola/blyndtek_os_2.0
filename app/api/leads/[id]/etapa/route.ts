import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { insertCobrosWithLeadIdFallback } from "@/lib/cobros/leadIdFallback";
import { getLeadEtapaIndex } from "@/lib/leads";
import { crearComisionDiagnostico, crearComisionVenta } from "@/lib/comisiones/crearComisionVenta";
import { crearOActualizarContrato } from "@/lib/contratos/crearOActualizarContrato";
import {
  materializarPropuestaDiagnostico,
  obtenerCondicionesDiagnostico
} from "@/lib/diagnostico/materializarPropuesta";
import { createAdminClient } from "@/lib/supabase/admin";
import { crearTareaConAdminClient } from "@/lib/tareas/crearTarea";
import { hoyLocalString } from "@/lib/utils/fechas";
import { ensureClienteDesdeLead } from "@/lib/clientes/ensureClienteDesdeLead";
import type { Database } from "@/types/supabase";
import {
  type EtapaLead,
  type Lead,
  type LeadStageTransitionInput,
  type LeadTouchKey
} from "@/types/leads";

type RouteContext = {
  params: {
    id: string;
  };
};

type UpdateEtapaBody = {
  etapa?: EtapaLead;
} & LeadStageTransitionInput;

function formatTimestamp(date = new Date()) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function appendNote(existing: string | null, entry: string) {
  const nextEntry = entry.trim();
  const previous = existing?.trim() ?? "";

  return [nextEntry, previous].filter(Boolean).join("\n");
}

function touchUpdate(touchpoint: LeadTouchKey | undefined) {
  const now = hoyLocalString();

  if (touchpoint === "llamada") {
    return { llamada_hecho: true, llamada_fecha: now.slice(0, 10) };
  }

  if (touchpoint === "seg1") {
    return { seg1_hecho: true, seg1_fecha: now.slice(0, 10) };
  }

  return { seg2_hecho: true, seg2_fecha: now.slice(0, 10) };
}

async function rollbackLead(
  supabase: ReturnType<typeof createAdminClient>,
  leadId: string,
  previousLead: Lead
) {
  const {
    id: rollbackId,
    created_at: rollbackCreatedAt,
    updated_at: rollbackUpdatedAt,
    vendedor_nombre: _rollbackVendedorNombre,
    comision_estimada_usd: _rollbackComisionEstimdaUsd,
    comision_estimada_pct: _rollbackComisionEstimdaPct,
    ...rest
  } = previousLead;

  void rollbackId;
  void rollbackCreatedAt;
  void rollbackUpdatedAt;
  void _rollbackVendedorNombre;
  void _rollbackComisionEstimdaUsd;
  void _rollbackComisionEstimdaPct;

  await supabase.from("leads").update(rest).eq("id", leadId);
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const supabase = createAdminClient();
  let ganadoFinalDesarrollo: number | null = null;
  let ganadoFinalMensual: number | null = null;

  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    if (currentUser.rol !== "admin" && currentUser.rol !== "comercial") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const body = (await request.json()) as UpdateEtapaBody;

    if (!body.etapa) {
      return NextResponse.json({ error: "Etapa is required" }, { status: 400 });
    }

    const { data: existingLead, error: fetchError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", params.id)
      .single();

    if (fetchError) {
      const status = fetchError.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: fetchError.message }, { status });
    }

    const lead = existingLead as Lead;

    if (currentUser.rol === "comercial" && lead.vendedor_id !== currentUser.id) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const currentIndex = getLeadEtapaIndex(lead.etapa);
    const targetIndex = getLeadEtapaIndex(body.etapa);
    const isForward = targetIndex > currentIndex;

    if (body.etapa === lead.etapa) {
      return NextResponse.json({ data: lead });
    }

    if (!isForward) {
      const { data, error } = await supabase
        .from("leads")
        .update({ etapa: body.etapa })
        .eq("id", params.id)
        .select("*")
        .single();

      if (error) {
        const status = error.code === "PGRST116" ? 404 : 500;
        return NextResponse.json({ error: error.message }, { status });
      }

      return NextResponse.json({ data: data as Lead });
    }

    const now = new Date();
    const updatePayload: Database["public"]["Tables"]["leads"]["Update"] = { etapa: body.etapa };

    if (body.etapa === "seguimiento") {
      const touchUpdatePayload = touchUpdate(body.touchpoint ?? "seg1");
      const nextNote = appendNote(
        lead.notas,
        `[${formatTimestamp(now)}] Seguimiento registrado: ${
          body.touchpoint === "llamada" ? "Llamada" : body.touchpoint === "seg2" ? "Seguimiento 2" : "Seguimiento 1"
        }`
      );

      Object.assign(updatePayload, touchUpdatePayload, { notas: nextNote });
    }

    if (body.etapa === "calificado") {
      if (body.calificacion_nota?.trim()) {
        Object.assign(updatePayload, {
          notas: appendNote(lead.notas, `[${formatTimestamp(now)}] Calificación: ${body.calificacion_nota.trim()}`)
        });
      }
    }

    if (body.etapa === "cotizacion") {
      if (typeof body.monto_propuesto_desarrollo !== "number") {
        return NextResponse.json({ error: "Monto propuesto de desarrollo is required" }, { status: 400 });
      }

      if (typeof body.monto_propuesto_mensual !== "number") {
        return NextResponse.json({ error: "Monto propuesto mensual is required" }, { status: 400 });
      }

      Object.assign(updatePayload, {
        monto_propuesto_desarrollo: body.monto_propuesto_desarrollo,
        monto_propuesto_mensual: body.monto_propuesto_mensual,
        notas: appendNote(
          lead.notas,
          `[${formatTimestamp(now)}] Pasó a cotización: desarrollo USD ${body.monto_propuesto_desarrollo.toLocaleString(
            "en-US"
          )} / mensual USD ${body.monto_propuesto_mensual.toLocaleString("en-US")}`
        )
      });
    }

    if (body.etapa === "diagnostico_ofrecido") {
      Object.assign(updatePayload, {
        notas: appendNote(lead.notas, `[${formatTimestamp(now)}] Diagnóstico pago ofrecido.`)
      });
    }

    if (body.etapa === "diagnostico_pagado") {
      if (typeof body.diagnostico_monto !== "number" || Number.isNaN(body.diagnostico_monto) || body.diagnostico_monto <= 0) {
        return NextResponse.json({ error: "El monto cobrado del diagnóstico es requerido." }, { status: 400 });
      }

      if (!body.diagnostico_fecha?.trim()) {
        return NextResponse.json({ error: "La fecha de cobro del diagnóstico es requerida." }, { status: 400 });
      }

      Object.assign(updatePayload, {
        notas: appendNote(
          lead.notas,
          `[${formatTimestamp(now)}] Diagnóstico pagado: USD ${body.diagnostico_monto.toLocaleString("en-US")}.`
        )
      });
    }

    if (body.etapa === "ganado") {
      const proposedDesarrollo = body.monto_propuesto_desarrollo ?? lead.monto_propuesto_desarrollo;
      const proposedMensual = body.monto_propuesto_mensual ?? lead.monto_propuesto_mensual;

      if (typeof proposedDesarrollo !== "number" || typeof proposedMensual !== "number") {
        return NextResponse.json(
          { error: "La etapa ganado requiere montos propuestos cargados previamente." },
          { status: 400 }
        );
      }

      if (body.mismo_monto === false) {
        const negotiatedDesarrollo = body.monto_negociado_desarrollo;
        const negotiatedMensual = body.monto_negociado_mensual;

        if (typeof negotiatedDesarrollo !== "number" || typeof negotiatedMensual !== "number") {
          return NextResponse.json(
            { error: "La etapa ganado requiere montos negociados cuando se elige monto distinto." },
            { status: 400 }
          );
        }
      }

      const finalDesarrollo =
        body.mismo_monto === false && typeof body.monto_negociado_desarrollo === "number"
          ? body.monto_negociado_desarrollo
          : proposedDesarrollo;
      const finalMensual =
        body.mismo_monto === false && typeof body.monto_negociado_mensual === "number"
          ? body.monto_negociado_mensual
          : proposedMensual;

      ganadoFinalDesarrollo = finalDesarrollo;
      ganadoFinalMensual = finalMensual;

      Object.assign(updatePayload, {
        monto_propuesto_desarrollo: proposedDesarrollo,
        monto_propuesto_mensual: proposedMensual,
        monto_negociado_desarrollo: finalDesarrollo,
        monto_negociado_mensual: finalMensual,
        notas: appendNote(
          lead.notas,
          `[${formatTimestamp(now)}] Ganado: desarrollo USD ${finalDesarrollo.toLocaleString(
            "en-US"
          )} / mensual USD ${finalMensual.toLocaleString("en-US")}`
        )
      });
    }

    const { data: updatedLead, error: updateError } = await supabase
      .from("leads")
      .update(updatePayload)
      .eq("id", params.id)
      .select("*")
      .single();

    if (updateError) {
      const status = updateError.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: updateError.message }, { status });
    }

    const nextLead = updatedLead as Lead;

    if (body.etapa === "seguimiento") {
      const followupDate = body.seguimiento_fecha?.trim() ?? null;

      if (followupDate) {
        try {
          const responsableId = lead.vendedor_id ?? currentUser.id;
          await crearTareaConAdminClient(supabase, {
            titulo: `Seguimiento — ${lead.empresa}`,
            lead_id: lead.id,
            responsable_id: responsableId,
            fecha_limite: followupDate,
            prioridad: "media",
            estado: "nueva",
            notas: null
          });
        } catch (taskError) {
          await rollbackLead(supabase, lead.id, lead);
          const message = taskError instanceof Error ? taskError.message : "No se pudo crear la tarea de seguimiento.";
          return NextResponse.json({ error: message }, { status: 500 });
        }
      }
    }

    if (body.etapa === "diagnostico_pagado") {
      const diagnosticoMonto = Number(body.diagnostico_monto);
      const diagnosticoFecha = body.diagnostico_fecha?.trim() ?? hoyLocalString();
      let cobroId: string | null = null;
      let comisionId: string | null = null;

      try {
        const { data: cobroCreado, error: cobroError } = await insertCobrosWithLeadIdFallback<{ id: string }>(
          supabase,
          {
            cliente_id: null,
            lead_id: lead.id,
            contrato_id: null,
            proyecto_id: null,
            suscripcion_id: null,
            cotizacion_id: null,
            concepto: `Diagnóstico — ${lead.empresa}`,
            tipo: "diagnostico",
            monto: diagnosticoMonto,
            fecha_emision: diagnosticoFecha,
            fecha_vencimiento: diagnosticoFecha,
            fecha_cobro: diagnosticoFecha,
            cuenta_medio: null,
            tolerancia_dias: 0,
            estado: "cobrado"
          },
          "id",
          { single: true }
        );

        if (cobroError || !cobroCreado) {
          throw new Error(cobroError?.message ?? "No se pudo registrar el cobro del diagnóstico.");
        }

        cobroId = cobroCreado.id;

        if (lead.vendedor_id) {
          const comision = await crearComisionDiagnostico(supabase, {
            vendedorId: lead.vendedor_id,
            leadId: lead.id,
            montoDiagnostico: diagnosticoMonto
          });
          comisionId = comision?.id ?? null;
        }
      } catch (error) {
        if (comisionId) {
          await supabase.from("comisiones").delete().eq("id", comisionId);
        }

        if (cobroId) {
          await supabase.from("cobros").delete().eq("id", cobroId);
        }

        await rollbackLead(supabase, lead.id, lead);

        const message = error instanceof Error ? error.message : "No se pudo registrar el diagnóstico pagado.";
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }

    if (body.etapa === "ganado") {
      let clienteResult: { cliente: { id: string; vendedor_id: string | null }; created: boolean } | null = null;
      let negotiationId: string | null = null;

      try {
        clienteResult = await ensureClienteDesdeLead(supabase, {
          lead,
          vendedorIdFallback: null
        });

        const cliente = clienteResult.cliente;
        const condiciones = await obtenerCondicionesDiagnostico(
          supabase,
          lead.id,
          Number(ganadoFinalDesarrollo ?? lead.monto_propuesto_desarrollo ?? 0),
          Number(ganadoFinalMensual ?? lead.monto_propuesto_mensual ?? 0)
        );

        if (body.mismo_monto === false) {
          const proposedDesarrollo = lead.monto_propuesto_desarrollo ?? body.monto_propuesto_desarrollo ?? null;
          const proposedMensual = lead.monto_propuesto_mensual ?? body.monto_propuesto_mensual ?? null;
          const finalDesarrollo =
            typeof body.monto_negociado_desarrollo === "number"
              ? body.monto_negociado_desarrollo
              : proposedDesarrollo;
          const finalMensual =
            typeof body.monto_negociado_mensual === "number"
              ? body.monto_negociado_mensual
              : proposedMensual;

          if (
            typeof proposedDesarrollo === "number" &&
            typeof proposedMensual === "number" &&
            (body.monto_negociado_desarrollo !== undefined || body.monto_negociado_mensual !== undefined)
          ) {
            const { data: negotiation, error: negotiationError } = await supabase
              .from("leads_negociaciones")
              .insert({
                lead_id: lead.id,
                monto_anterior_desarrollo: proposedDesarrollo,
                monto_anterior_mensual: proposedMensual,
                monto_nuevo_desarrollo: finalDesarrollo ?? proposedDesarrollo,
                monto_nuevo_mensual: finalMensual ?? proposedMensual,
                nota: body.motivo_negociacion?.trim() || null,
                creado_por: currentUser.id
              } as never)
              .select("id")
              .single();

            if (negotiationError || !negotiation) {
              throw new Error(negotiationError?.message ?? "No se pudo registrar la negociación.");
            }

            negotiationId = negotiation.id;
          }
        }

        const desarrolloContrato = Number(ganadoFinalDesarrollo ?? condiciones.precio_desarrollo_usd ?? 0);
        const mantenimientoMensual = Number(ganadoFinalMensual ?? condiciones.mantenimiento_mensual_usd ?? 0);
        const montoVenta = desarrolloContrato + mantenimientoMensual;
        const fechaPrimeraCuota = condiciones.fecha_primera_cuota || hoyLocalString();
        const fechaAdelanto = condiciones.fecha_adelanto || hoyLocalString();

        const materialized = await materializarPropuestaDiagnostico(supabase, {
          lead,
          clienteId: cliente.id,
          responsableId: cliente.vendedor_id ?? currentUser.id,
          precioDesarrollo: desarrolloContrato,
          precioMensual: mantenimientoMensual,
          condicionesOverride: {
            ...condiciones,
            precio_desarrollo_usd: desarrolloContrato,
            mantenimiento_mensual_usd: mantenimientoMensual
          }
        });

        await crearOActualizarContrato(supabase, cliente.id, {
          valor_total: desarrolloContrato,
          lead_id: lead.id,
          adelanto_pct: condiciones.adelanto_pct,
          fecha_adelanto: fechaAdelanto,
          cantidad_cuotas: condiciones.cantidad_cuotas,
          dia_pago: condiciones.dia_pago,
          fecha_primera_cuota: fechaPrimeraCuota,
          valor_mantenimiento_mensual: mantenimientoMensual > 0 ? mantenimientoMensual : null,
          dia_facturacion_mantenimiento:
            mantenimientoMensual > 0
              ? condiciones.dia_facturacion_mantenimiento ?? condiciones.dia_pago
              : null,
          hitos_pago: materialized?.hitosPago
        });

        if (cliente.vendedor_id) {
          try {
            await crearComisionVenta(supabase, {
              vendedorId: cliente.vendedor_id,
              clienteId: cliente.id,
              cotizacionId: materialized?.cotizacionId ?? null,
              montoVenta
            });
          } catch (commissionError) {
            const message =
              commissionError instanceof Error
                ? commissionError.message
                : "Unexpected commission error";
            console.error("No se pudo crear la comisión del lead ganado:", message);
          }
        }
      } catch (error) {
        if (negotiationId) {
          await supabase.from("leads_negociaciones").delete().eq("id", negotiationId);
        }

        if (clienteResult?.created) {
          await supabase.from("clientes").delete().eq("lead_id", lead.id);
        }

        await rollbackLead(supabase, lead.id, lead);

        const message = error instanceof Error ? error.message : "No se pudo completar el cierre del lead.";
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }

    return NextResponse.json({ data: nextLead });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
