import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { fechaInputAString, fechaStringAFechaLocal } from "@/lib/utils/fechas";
import type {
  CreateTransferenciaCajaInput,
  TransferenciaCaja,
  TransferenciaCajaListadoItem,
  TransferenciaCajaResponse
} from "@/types/transferencias";

type CajaRow = {
  id: string;
  nombre: string;
  slug: string;
  activa: boolean;
};

type TransferenciaJoinRow = TransferenciaCaja & {
  caja_origen: { nombre: string } | null;
  caja_destino: { nombre: string } | null;
};

function isValidDate(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  const date = fechaStringAFechaLocal(value);
  return Boolean(date && !Number.isNaN(date.getTime()));
}

function parseAmount(value: unknown) {
  return typeof value === "number" ? value : Number(value);
}

function mapTransferenciaRow(row: TransferenciaJoinRow): TransferenciaCajaListadoItem {
  return {
    id: row.id,
    caja_origen_id: row.caja_origen_id,
    caja_destino_id: row.caja_destino_id,
    caja_origen_nombre: row.caja_origen?.nombre ?? "Caja origen",
    caja_destino_nombre: row.caja_destino?.nombre ?? "Caja destino",
    monto: row.monto,
    fecha: row.fecha,
    nota: row.nota,
    egreso_id: row.egreso_id,
    cobro_id: row.cobro_id,
    creado_por: row.creado_por,
    created_at: row.created_at
  };
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const cajaId = request.nextUrl.searchParams.get("caja_id")?.trim() || null;

    let query = supabase
      .from("transferencias_caja")
      .select(
        "id, caja_origen_id, caja_destino_id, monto, fecha, nota, egreso_id, cobro_id, creado_por, created_at, caja_origen:cajas!transferencias_caja_caja_origen_id_fkey(nombre), caja_destino:cajas!transferencias_caja_caja_destino_id_fkey(nombre)"
      )
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false });

    if (cajaId) {
      query = query.or(`caja_origen_id.eq.${cajaId},caja_destino_id.eq.${cajaId}`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const transferencias = ((data ?? []) as TransferenciaJoinRow[]).map(mapTransferenciaRow);
    return NextResponse.json({ data: transferencias });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let egresoId: string | null = null;
  let cobroId: string | null = null;

  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as CreateTransferenciaCajaInput;
    const cajaOrigenId = body.caja_origen_id?.trim() || "";
    const cajaDestinoId = body.caja_destino_id?.trim() || "";
    const monto = parseAmount(body.monto);
    const fecha = fechaInputAString(body.fecha);
    const nota = body.nota?.trim() || null;

    if (!cajaOrigenId || !cajaDestinoId) {
      return NextResponse.json({ error: "caja_origen_id and caja_destino_id are required" }, { status: 400 });
    }

    if (cajaOrigenId === cajaDestinoId) {
      return NextResponse.json({ error: "Las cajas de origen y destino deben ser distintas." }, { status: 400 });
    }

    if (!Number.isFinite(monto) || monto <= 0) {
      return NextResponse.json({ error: "monto must be greater than 0" }, { status: 400 });
    }

    if (!isValidDate(fecha)) {
      return NextResponse.json({ error: "fecha must be a valid YYYY-MM-DD string" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: cajas, error: cajasError } = await supabase
      .from("cajas")
      .select("id, nombre, slug, activa")
      .in("id", [cajaOrigenId, cajaDestinoId]);

    if (cajasError) {
      return NextResponse.json({ error: cajasError.message }, { status: 500 });
    }

    const cajaOrigen = ((cajas ?? []) as CajaRow[]).find((item) => item.id === cajaOrigenId) ?? null;
    const cajaDestino = ((cajas ?? []) as CajaRow[]).find((item) => item.id === cajaDestinoId) ?? null;

    if (!cajaOrigen || !cajaDestino) {
      return NextResponse.json({ error: "Ambas cajas deben existir." }, { status: 400 });
    }

    if (!cajaOrigen.activa || !cajaDestino.activa) {
      return NextResponse.json({ error: "Ambas cajas deben estar activas." }, { status: 400 });
    }

    const { data: egreso, error: egresoError } = await supabase
      .from("egresos")
      .insert({
        categoria: "transferencia",
        concepto: `Transferencia a ${cajaDestino.nombre}`,
        monto,
        fecha,
        pagado: true,
        fecha_pago: fecha,
        caja_id: cajaOrigen.id,
        cuenta_medio: cajaOrigen.slug,
        recurrente: false,
        notas: nota
      })
      .select("id")
      .single();

    if (egresoError || !egreso) {
      return NextResponse.json({ error: egresoError?.message ?? "No se pudo crear el egreso de transferencia." }, { status: 500 });
    }

    egresoId = egreso.id;

    const { data: cobro, error: cobroError } = await supabase
      .from("cobros")
      .insert({
        cliente_id: null,
        lead_id: null,
        contrato_id: null,
        proyecto_id: null,
        suscripcion_id: null,
        cotizacion_id: null,
        caja_id: cajaDestino.id,
        concepto: `Transferencia desde ${cajaOrigen.nombre}`,
        tipo: "transferencia",
        monto,
        fecha_emision: fecha,
        fecha_vencimiento: fecha,
        fecha_cobro: fecha,
        cuenta_medio: cajaDestino.slug,
        tolerancia_dias: 0,
        estado: "cobrado"
      })
      .select("id")
      .single();

    if (cobroError || !cobro) {
      if (egresoId) {
        await supabase.from("egresos").delete().eq("id", egresoId);
      }

      return NextResponse.json({ error: cobroError?.message ?? "No se pudo crear el cobro de transferencia." }, { status: 500 });
    }

    cobroId = cobro.id;

    const { data: transferencia, error: transferenciaError } = await supabase
      .from("transferencias_caja")
      .insert({
        caja_origen_id: cajaOrigen.id,
        caja_destino_id: cajaDestino.id,
        monto,
        fecha,
        nota,
        egreso_id: egresoId,
        cobro_id: cobroId,
        creado_por: admin.id
      })
      .select(
        "id, caja_origen_id, caja_destino_id, monto, fecha, nota, egreso_id, cobro_id, creado_por, created_at, caja_origen:cajas!transferencias_caja_caja_origen_id_fkey(nombre), caja_destino:cajas!transferencias_caja_caja_destino_id_fkey(nombre)"
      )
      .single();

    if (transferenciaError || !transferencia) {
      if (cobroId) {
        await supabase.from("cobros").delete().eq("id", cobroId);
      }

      if (egresoId) {
        await supabase.from("egresos").delete().eq("id", egresoId);
      }

      return NextResponse.json(
        { error: transferenciaError?.message ?? "No se pudo registrar la transferencia entre cajas." },
        { status: 500 }
      );
    }

    const payload: TransferenciaCajaResponse = {
      data: mapTransferenciaRow(transferencia as TransferenciaJoinRow)
    };

    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    const supabase = createAdminClient();

    if (cobroId) {
      await supabase.from("cobros").delete().eq("id", cobroId);
    }

    if (egresoId) {
      await supabase.from("egresos").delete().eq("id", egresoId);
    }

    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
