import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateContratoInput, CreateContratoResponse } from "@/types/contratos";
import type { Cobro } from "@/types/cobros";
import type { Database } from "@/types/supabase";
import type { Suscripcion } from "@/types/suscripciones";

type ContratoRow = {
  id: string;
  cliente_id: string;
  valor_total: number;
  cantidad_cuotas: number;
  dia_pago: number;
  fecha_primera_cuota: string;
  valor_mantenimiento_mensual: number | null;
  dia_facturacion_mantenimiento: number | null;
  estado: "activo" | "reemplazado";
  reemplaza_a: string | null;
  motivo_redefinicion: string | null;
  created_at: string;
};

type SuscripcionRow = Suscripcion;
type CobroRow = Cobro;

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function normalizeMoney(value: number) {
  return Number(value.toFixed(2));
}

function addMonthsWithDay(baseDate: string, monthOffset: number, dayOfMonth: number) {
  const date = new Date(`${baseDate}T12:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + monthOffset);
  date.setUTCDate(dayOfMonth);
  return toIsoDate(date);
}

function buildMantenimientoProximaCobro(fechaBase: string, diaFacturacion: number | null) {
  if (!diaFacturacion) {
    return fechaBase;
  }

  const baseDate = new Date(`${fechaBase}T12:00:00.000Z`);
  const baseDay = baseDate.getUTCDate();

  if (baseDay <= diaFacturacion) {
    baseDate.setUTCDate(diaFacturacion);
    return toIsoDate(baseDate);
  }

  baseDate.setUTCMonth(baseDate.getUTCMonth() + 1);
  baseDate.setUTCDate(diaFacturacion);
  return toIsoDate(baseDate);
}

function buildCuotaMontoDistribucion(valorTotal: number, cantidadCuotas: number) {
  const totalCents = Math.round(valorTotal * 100);
  const baseCents = Math.floor(totalCents / cantidadCuotas);
  const cuotas = Array.from({ length: cantidadCuotas }, (_value, index) =>
    index === cantidadCuotas - 1 ? totalCents - baseCents * (cantidadCuotas - 1) : baseCents
  );

  return cuotas.map((cents) => cents / 100);
}

async function fetchActiveContrato(supabase: SupabaseClient<Database>, clienteId: string) {
  const { data, error } = await supabase
    .from("contratos")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("estado", "activo")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as ContratoRow;
}

export async function crearOActualizarContrato(
  supabase: SupabaseClient<Database>,
  clienteId: string,
  input: CreateContratoInput
): Promise<CreateContratoResponse> {
  const valorTotal = Number(input.valor_total);
  const cantidadCuotas = Number(input.cantidad_cuotas);
  const diaPago = Number(input.dia_pago);
  const fechaPrimeraCuota = input.fecha_primera_cuota?.trim() ?? "";
  const valorMantenimientoMensual =
    input.valor_mantenimiento_mensual == null ? null : Number(input.valor_mantenimiento_mensual);
  const diaFacturacionMantenimiento =
    input.dia_facturacion_mantenimiento == null ? null : Number(input.dia_facturacion_mantenimiento);
  const motivoRedefinicion = input.motivo_redefinicion?.trim() ?? null;

  if (Number.isNaN(valorTotal) || valorTotal <= 0) {
    throw new Error("valor_total must be a valid positive number");
  }

  if (!Number.isInteger(cantidadCuotas) || cantidadCuotas < 1) {
    throw new Error("cantidad_cuotas must be at least 1");
  }

  if (!Number.isInteger(diaPago) || diaPago < 1 || diaPago > 28) {
    throw new Error("dia_pago must be between 1 and 28");
  }

  if (!fechaPrimeraCuota) {
    throw new Error("fecha_primera_cuota is required");
  }

  if (valorMantenimientoMensual != null && (Number.isNaN(valorMantenimientoMensual) || valorMantenimientoMensual < 0)) {
    throw new Error("valor_mantenimiento_mensual must be a valid number");
  }

  if (valorMantenimientoMensual && valorMantenimientoMensual > 0) {
    const diaFacturacion = diaFacturacionMantenimiento ?? NaN;

    if (!Number.isInteger(diaFacturacion) || diaFacturacion < 1 || diaFacturacion > 28) {
      throw new Error("dia_facturacion_mantenimiento must be between 1 and 28 when mantenimiento is configured");
    }
  }

  let newContratoId: string | null = null;
  let oldContrato: ContratoRow | null = null;
  let oldCobrosPendientes: CobroRow[] = [];
  let insertedCobros: CobroRow[] = [];
  let insertedSuscripcion: SuscripcionRow | null = null;
  let updatedSuscripcionAnterior: SuscripcionRow | null = null;
  let finalizacionAplicada = false;

  try {
    const currentDate = toIsoDate(new Date());
    const activeContrato = await fetchActiveContrato(supabase, clienteId);
    oldContrato = activeContrato;

    if (oldContrato) {
      const { data: cobrosViejos, error: cobrosViejosError } = await supabase
        .from("cobros")
        .select("*")
        .eq("contrato_id", oldContrato.id)
        .neq("estado", "cobrado");

      if (cobrosViejosError) {
        throw new Error(cobrosViejosError.message);
      }

      oldCobrosPendientes = (cobrosViejos ?? []) as CobroRow[];
    }

    const contratoPayload = {
      cliente_id: clienteId,
      valor_total: normalizeMoney(valorTotal),
      cantidad_cuotas: cantidadCuotas,
      dia_pago: diaPago,
      fecha_primera_cuota: fechaPrimeraCuota,
      valor_mantenimiento_mensual:
        valorMantenimientoMensual != null && valorMantenimientoMensual > 0 ? normalizeMoney(valorMantenimientoMensual) : null,
      dia_facturacion_mantenimiento:
        valorMantenimientoMensual != null && valorMantenimientoMensual > 0 ? diaFacturacionMantenimiento : null,
      estado: "activo" as const,
      reemplaza_a: oldContrato?.id ?? null,
      motivo_redefinicion: motivoRedefinicion
    };

    const { data: contratoCreado, error: contratoError } = await supabase
      .from("contratos")
      .insert(contratoPayload)
      .select("*")
      .single();

    if (contratoError || !contratoCreado) {
      throw new Error(contratoError?.message ?? "No se pudo crear el contrato.");
    }

    newContratoId = (contratoCreado as ContratoRow).id;

    const cuotas = buildCuotaMontoDistribucion(normalizeMoney(valorTotal), cantidadCuotas);
    const cobrosPayload = cuotas.map((monto, index) => ({
      cliente_id: clienteId,
      contrato_id: newContratoId,
      proyecto_id: null,
      suscripcion_id: null,
      cotizacion_id: null,
      concepto: `Cuota ${index + 1} del contrato`,
      tipo: "hito" as const,
      monto: normalizeMoney(monto),
      fecha_emision: currentDate,
      fecha_vencimiento: index === 0 ? fechaPrimeraCuota : addMonthsWithDay(fechaPrimeraCuota, index, diaPago),
      fecha_cobro: null,
      cuenta_medio: null,
      tolerancia_dias: 0,
      estado: "pendiente" as const
    }));

    const { data: cobrosCreados, error: cobrosError } = await supabase.from("cobros").insert(cobrosPayload).select("*");

    if (cobrosError) {
      throw new Error(cobrosError.message);
    }

    insertedCobros = ((cobrosCreados ?? []) as CobroRow[]).slice();

    if (oldContrato) {
      const { error: deleteOldError } = await supabase
        .from("cobros")
        .delete()
        .eq("contrato_id", oldContrato.id)
        .neq("estado", "cobrado");

      if (deleteOldError) {
        throw new Error(deleteOldError.message);
      }

      const { error: replaceOldError } = await supabase.from("contratos").update({ estado: "reemplazado" }).eq("id", oldContrato.id);

      if (replaceOldError) {
        throw new Error(replaceOldError.message);
      }

      finalizacionAplicada = true;
    }

    if (valorMantenimientoMensual != null && valorMantenimientoMensual > 0) {
      const fechaInicio = fechaPrimeraCuota;
      const proximaCobro = buildMantenimientoProximaCobro(fechaPrimeraCuota, diaFacturacionMantenimiento);

      if (oldContrato) {
        const { data: suscripcionVieja, error: suscripcionViejaError } = await supabase
          .from("suscripciones")
          .select("*")
          .eq("contrato_id", oldContrato.id)
          .maybeSingle();

        if (suscripcionViejaError) {
          throw new Error(suscripcionViejaError.message);
        }

        if (suscripcionVieja) {
          updatedSuscripcionAnterior = suscripcionVieja as SuscripcionRow;

          const { data: suscripcionActualizada, error: updateSuscripcionError } = await supabase
            .from("suscripciones")
            .update({
              contrato_id: newContratoId,
              monto_mensual: normalizeMoney(valorMantenimientoMensual),
              fecha_inicio: fechaInicio,
              proxima_cobro: proximaCobro,
              estado: "pendiente",
              tipo: "mantenimiento",
              ciclo: "mensual"
            })
            .eq("id", suscripcionVieja.id)
            .select("*")
            .single();

          if (updateSuscripcionError || !suscripcionActualizada) {
            throw new Error(updateSuscripcionError?.message ?? "No se pudo actualizar la suscripción de mantenimiento.");
          }

          insertedSuscripcion = suscripcionActualizada as SuscripcionRow;
        } else {
          const { data: suscripcionCreada, error: createSuscripcionError } = await supabase
            .from("suscripciones")
            .insert({
              cliente_id: clienteId,
              contrato_id: newContratoId,
              proyecto_id: null,
              cotizacion_id: null,
              producto_id: null,
              plan_id: null,
              tipo: "mantenimiento",
              monto_mensual: normalizeMoney(valorMantenimientoMensual),
              ciclo: "mensual",
              fecha_inicio: fechaInicio,
              proxima_cobro: proximaCobro,
              estado: "pendiente",
              fecha_baja: null,
              motivo_baja: null
            })
            .select("*")
            .single();

          if (createSuscripcionError || !suscripcionCreada) {
            throw new Error(createSuscripcionError?.message ?? "No se pudo crear la suscripción de mantenimiento.");
          }

          insertedSuscripcion = suscripcionCreada as SuscripcionRow;
        }
      } else {
        const { data: suscripcionCreada, error: createSuscripcionError } = await supabase
          .from("suscripciones")
          .insert({
            cliente_id: clienteId,
            contrato_id: newContratoId,
            proyecto_id: null,
            cotizacion_id: null,
            producto_id: null,
            plan_id: null,
            tipo: "mantenimiento",
            monto_mensual: normalizeMoney(valorMantenimientoMensual),
            ciclo: "mensual",
            fecha_inicio: fechaInicio,
            proxima_cobro: proximaCobro,
            estado: "pendiente",
            fecha_baja: null,
            motivo_baja: null
          })
          .select("*")
          .single();

        if (createSuscripcionError || !suscripcionCreada) {
          throw new Error(createSuscripcionError?.message ?? "No se pudo crear la suscripción de mantenimiento.");
        }

        insertedSuscripcion = suscripcionCreada as SuscripcionRow;
      }
    }

    const contratoResponse = contratoCreado as ContratoRow;
    return {
      contrato: contratoResponse,
      cobros_creados: insertedCobros.length,
      cobros_eliminados: oldCobrosPendientes.length,
      cobros_eliminados_monto: oldCobrosPendientes.reduce((accumulator, cobro) => accumulator + cobro.monto, 0),
      suscripcion: insertedSuscripcion,
      contrato_anterior_id: oldContrato?.id ?? null
    };
  } catch (error) {
    try {
      if (finalizacionAplicada && oldContrato) {
        if (oldCobrosPendientes.length > 0) {
          const cobrosParaReinsertar = oldCobrosPendientes.map((cobro) => {
            const { cliente, historial, ...rest } = cobro;
            void cliente;
            void historial;
            return rest;
          });
          await supabase.from("cobros").insert(cobrosParaReinsertar);
        }

        await supabase.from("contratos").update({ estado: "activo" }).eq("id", oldContrato.id);
      }

      if (insertedSuscripcion?.id) {
        if (updatedSuscripcionAnterior) {
          await supabase
            .from("suscripciones")
            .update({
              contrato_id: updatedSuscripcionAnterior.contrato_id,
              monto_mensual: updatedSuscripcionAnterior.monto_mensual,
              fecha_inicio: updatedSuscripcionAnterior.fecha_inicio,
              proxima_cobro: updatedSuscripcionAnterior.proxima_cobro,
              estado: updatedSuscripcionAnterior.estado,
              tipo: updatedSuscripcionAnterior.tipo,
              ciclo: updatedSuscripcionAnterior.ciclo
            })
            .eq("id", updatedSuscripcionAnterior.id);
        } else {
          await supabase.from("suscripciones").delete().eq("id", insertedSuscripcion.id);
        }
      }

      if (insertedCobros.length > 0) {
        await supabase.from("cobros").delete().eq("contrato_id", newContratoId ?? "");
      }

      if (newContratoId) {
        await supabase.from("contratos").delete().eq("id", newContratoId);
      }
    } catch {
      // Best effort rollback.
    }

    throw error instanceof Error ? error : new Error("Unexpected error");
  }
}
