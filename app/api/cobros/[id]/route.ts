import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { hoyLocalString } from "@/lib/utils/fechas";
import type { Cobro, UpdateCobroInput } from "@/types/cobros";

type RouteContext = {
  params: {
    id: string;
  };
};

type CobroHistorialRow = {
  id: string;
  cobro_id: string;
  monto_anterior: number | null;
  monto_nuevo: number | null;
  fecha_anterior: string | null;
  fecha_nueva: string | null;
  nota: string | null;
  modificado_por: string | null;
  created_at: string;
};

type CobroHistorialItem = CobroHistorialRow & {
  modificado_por_nombre: string | null;
};

type CobroConHistorial = Cobro & {
  historial: CobroHistorialItem[];
};

async function fetchCobroHistorial(supabase: ReturnType<typeof createAdminClient>, cobroId: string) {
  const { data: historial, error } = await supabase
    .from("cobros_historial_cambios")
    .select("id, cobro_id, monto_anterior, monto_nuevo, fecha_anterior, fecha_nueva, nota, modificado_por, created_at")
    .eq("cobro_id", cobroId)
    .order("created_at", { ascending: false })
    .returns<CobroHistorialRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  const modificadoPorIds = [...new Set((historial ?? []).map((item) => item.modificado_por).filter((value): value is string => Boolean(value)))];

  if (modificadoPorIds.length === 0) {
    return (historial ?? []).map<CobroHistorialItem>((item) => ({
      ...item,
      modificado_por_nombre: null
    }));
  }

  const { data: usuarios, error: usuariosError } = await supabase
    .from("usuarios")
    .select("id, nombre")
    .in("id", modificadoPorIds)
    .returns<Array<{ id: string; nombre: string }>>();

  if (usuariosError) {
    throw new Error(usuariosError.message);
  }

  const nombres = new Map((usuarios ?? []).map((usuario) => [usuario.id, usuario.nombre] as const));

  return (historial ?? []).map<CobroHistorialItem>((item) => ({
    ...item,
    modificado_por_nombre: item.modificado_por ? nombres.get(item.modificado_por) ?? null : null
  }));
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.from("cobros").select("*").eq("id", context.params.id).single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    const historial = await fetchCobroHistorial(supabase, context.params.id);

    return NextResponse.json({
      data: {
        ...(data as Cobro),
        historial
      } satisfies CobroConHistorial
    });
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

    const body = (await request.json()) as UpdateCobroInput;
    const supabase = createAdminClient();
    const { nota_historial, ...updatableBody } = body;

    const { data: existingCobro, error: existingError } = await supabase
      .from("cobros")
      .select("id, monto, fecha_vencimiento, fecha_cobro")
      .eq("id", context.params.id)
      .single();

    if (existingError) {
      const status = existingError.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: existingError.message }, { status });
    }

    const currentCobro = existingCobro as Pick<Cobro, "id" | "monto" | "fecha_vencimiento" | "fecha_cobro">;
    const nextMonto = updatableBody.monto ?? currentCobro.monto;
    const nextFechaVencimiento = updatableBody.fecha_vencimiento ?? currentCobro.fecha_vencimiento;
    let nextFechaCobro = updatableBody.fecha_cobro ?? currentCobro.fecha_cobro;

    if (updatableBody.estado === "cobrado") {
      nextFechaCobro = updatableBody.fecha_cobro ?? currentCobro.fecha_cobro ?? hoyLocalString();
    } else if (updatableBody.estado) {
      nextFechaCobro = updatableBody.fecha_cobro ?? null;
    }

    const nextPayload: Omit<UpdateCobroInput, "nota_historial"> = {
      ...updatableBody,
      fecha_cobro: nextFechaCobro
    };

    const { data, error } = await supabase
      .from("cobros")
      .update(nextPayload)
      .eq("id", context.params.id)
      .select("*")
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    const changedMonto = updatableBody.monto !== undefined && nextMonto !== currentCobro.monto;
    const changedFecha = updatableBody.fecha_vencimiento !== undefined && nextFechaVencimiento !== currentCobro.fecha_vencimiento;

    if (changedMonto || changedFecha) {
      const { error: historialError } = await supabase.from("cobros_historial_cambios").insert({
        cobro_id: context.params.id,
        monto_anterior: changedMonto ? currentCobro.monto : null,
        monto_nuevo: changedMonto ? nextMonto : null,
        fecha_anterior: changedFecha ? currentCobro.fecha_vencimiento : null,
        fecha_nueva: changedFecha ? nextFechaVencimiento : null,
        nota: nota_historial?.trim() || null,
        modificado_por: admin.id
      });

      if (historialError) {
        return NextResponse.json({ error: historialError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ data: data as Cobro });
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
    const { error } = await supabase.from("cobros").delete().eq("id", context.params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
