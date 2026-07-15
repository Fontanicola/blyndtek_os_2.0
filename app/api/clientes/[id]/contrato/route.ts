import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Contrato, ContratoCobroResumen, ContratoDetalle, CreateContratoInput, CreateContratoResponse } from "@/types/contratos";
import type { Cobro } from "@/types/cobros";
import type { Suscripcion } from "@/types/suscripciones";

type RouteContext = {
  params: {
    id: string;
  };
};

type ClienteMinimo = {
  id: string;
  vendedor_id: string | null;
};

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

const estadosCobro = ["cobrado", "pendiente", "facturado", "vencido"] as const;

function emptyResumen(): ContratoCobroResumen {
  return {
    cobrado: { cantidad: 0, monto: 0 },
    pendiente: { cantidad: 0, monto: 0 },
    facturado: { cantidad: 0, monto: 0 },
    vencido: { cantidad: 0, monto: 0 },
    total: { cantidad: 0, monto: 0 }
  };
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addMonthsWithDay(baseDate: string, monthOffset: number, dayOfMonth: number) {
  const date = new Date(`${baseDate}T12:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + monthOffset);
  date.setUTCDate(dayOfMonth);
  return toIsoDate(date);
}

function normalizeMoney(value: number) {
  return Number(value.toFixed(2));
}

function buildCobrosResumen(cobros: CobroRow[]): ContratoCobroResumen {
  const resumen = emptyResumen();

  for (const cobro of cobros) {
    const estado = estadosCobro.includes(cobro.estado as (typeof estadosCobro)[number])
      ? (cobro.estado as (typeof estadosCobro)[number])
      : null;

    if (!estado) {
      continue;
    }

    resumen[estado].cantidad += 1;
    resumen[estado].monto += cobro.monto;
    resumen.total.cantidad += 1;
    resumen.total.monto += cobro.monto;
  }

  return resumen;
}

function buildCuotaMontoDistribucion(valorTotal: number, cantidadCuotas: number) {
  const totalCents = Math.round(valorTotal * 100);
  const baseCents = Math.floor(totalCents / cantidadCuotas);
  const cuotas = Array.from({ length: cantidadCuotas }, (_, index) =>
    index === cantidadCuotas - 1 ? totalCents - baseCents * (cantidadCuotas - 1) : baseCents
  );

  return cuotas.map((cents) => cents / 100);
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

async function fetchClienteWithAccess(supabase: ReturnType<typeof createAdminClient>, clienteId: string, currentUserId: string, rol: string) {
  const { data, error } = await supabase.from("clientes").select("id, vendedor_id").eq("id", clienteId).single();

  if (error) {
    return { error: error.message, status: error.code === "PGRST116" ? 404 : 500 } as const;
  }

  const cliente = data as ClienteMinimo;

  if (rol === "comercial" && cliente.vendedor_id !== currentUserId) {
    return { error: "No autorizado.", status: 403 } as const;
  }

  if (rol !== "admin" && rol !== "comercial") {
    return { error: "No autorizado.", status: 403 } as const;
  }

  return { data: cliente } as const;
}

async function fetchActiveContrato(
  supabase: ReturnType<typeof createAdminClient>,
  clienteId: string
): Promise<Contrato | null> {
  const { data, error } = await supabase
    .from("contratos")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("estado", "activo")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as Contrato;
}

async function buildContratoData(
  supabase: ReturnType<typeof createAdminClient>,
  clienteId: string
): Promise<ContratoDetalle> {
  const contrato = await fetchActiveContrato(supabase, clienteId);

  if (!contrato) {
    return {
      contrato: null,
      cobros_resumen: emptyResumen()
    };
  }

  const { data: cobros, error } = await supabase
    .from("cobros")
    .select("*")
    .eq("contrato_id", contrato.id)
    .order("fecha_vencimiento", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return {
    contrato,
    cobros_resumen: buildCobrosResumen((cobros ?? []) as CobroRow[])
  };
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const access = await fetchClienteWithAccess(supabase, params.id, currentUser.id, currentUser.rol);

    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const data = await buildContratoData(supabase, params.id);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  let newContratoId: string | null = null;
  let oldContrato: ContratoRow | null = null;
  let oldCobrosPendientes: CobroRow[] = [];
  let insertedCobros: CobroRow[] = [];
  let insertedSuscripcion: SuscripcionRow | null = null;
  let updatedSuscripcionAnterior: SuscripcionRow | null = null;
  let finalizacionAplicada = false;

  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const access = await fetchClienteWithAccess(supabase, params.id, currentUser.id, currentUser.rol);

    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = (await request.json()) as CreateContratoInput;
    const valorTotal = Number(body.valor_total);
    const cantidadCuotas = Number(body.cantidad_cuotas);
    const diaPago = Number(body.dia_pago);
    const fechaPrimeraCuota = body.fecha_primera_cuota?.trim() ?? "";
    const valorMantenimientoMensual =
      body.valor_mantenimiento_mensual == null
        ? null
        : Number(body.valor_mantenimiento_mensual);
    const diaFacturacionMantenimiento =
      body.dia_facturacion_mantenimiento == null
        ? null
        : Number(body.dia_facturacion_mantenimiento);
    const motivoRedefinicion = body.motivo_redefinicion?.trim() ?? null;

    if (Number.isNaN(valorTotal) || valorTotal <= 0) {
      return NextResponse.json({ error: "valor_total must be a valid positive number" }, { status: 400 });
    }

    if (!Number.isInteger(cantidadCuotas) || cantidadCuotas < 1) {
      return NextResponse.json({ error: "cantidad_cuotas must be at least 1" }, { status: 400 });
    }

    if (!Number.isInteger(diaPago) || diaPago < 1 || diaPago > 28) {
      return NextResponse.json({ error: "dia_pago must be between 1 and 28" }, { status: 400 });
    }

    if (!fechaPrimeraCuota) {
      return NextResponse.json({ error: "fecha_primera_cuota is required" }, { status: 400 });
    }

    if (valorMantenimientoMensual != null && (Number.isNaN(valorMantenimientoMensual) || valorMantenimientoMensual < 0)) {
      return NextResponse.json({ error: "valor_mantenimiento_mensual must be a valid number" }, { status: 400 });
    }

    if (valorMantenimientoMensual && valorMantenimientoMensual > 0) {
      const diaFacturacion = diaFacturacionMantenimiento ?? NaN;

      if (!Number.isInteger(diaFacturacion) || diaFacturacion < 1 || diaFacturacion > 28) {
        return NextResponse.json(
          { error: "dia_facturacion_mantenimiento must be between 1 and 28 when mantenimiento is configured" },
          { status: 400 }
        );
      }
    }

    const currentDate = toIsoDate(new Date());
    const activeContrato = await fetchActiveContrato(supabase, params.id);
    oldContrato = activeContrato ? (activeContrato as ContratoRow) : null;

    if (oldContrato) {
      const { data: cobrosViejos, error: cobrosViejosError } = await supabase
        .from("cobros")
        .select("*")
        .eq("contrato_id", oldContrato.id)
        .neq("estado", "cobrado");

      if (cobrosViejosError) {
        return NextResponse.json({ error: cobrosViejosError.message }, { status: 500 });
      }

      oldCobrosPendientes = (cobrosViejos ?? []) as CobroRow[];
    }

    const contratoPayload = {
      cliente_id: params.id,
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
      return NextResponse.json({ error: contratoError?.message ?? "No se pudo crear el contrato." }, { status: 500 });
    }

    newContratoId = (contratoCreado as ContratoRow).id;

    const cuotas = buildCuotaMontoDistribucion(normalizeMoney(valorTotal), cantidadCuotas);
    const cobrosPayload = cuotas.map((monto, index) => ({
      cliente_id: params.id,
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

      const { error: replaceOldError } = await supabase
        .from("contratos")
        .update({ estado: "reemplazado" })
        .eq("id", oldContrato.id);

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
              cliente_id: params.id,
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
            cliente_id: params.id,
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
    const resumen: CreateContratoResponse = {
      contrato: contratoResponse,
      cobros_creados: insertedCobros.length,
      cobros_eliminados: oldCobrosPendientes.length,
      cobros_eliminados_monto: oldCobrosPendientes.reduce((accumulator, cobro) => accumulator + cobro.monto, 0),
      suscripcion: insertedSuscripcion,
      contrato_anterior_id: oldContrato?.id ?? null
    };

    return NextResponse.json({ data: resumen }, { status: 201 });
  } catch (error) {
    try {
      const supabase = createAdminClient();

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

    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
