import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Comision } from "@/types/comisiones";

type RouteContext = {
  params: {
    id: string;
  };
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    if (currentUser.rol !== "admin") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { data: comision, error: comisionError } = await supabase
      .from("comisiones")
      .select("id, vendedor_id, cliente_id, proyecto_id, estado, monto_comision, updated_at")
      .eq("id", context.params.id)
      .single();

    if (comisionError) {
      const status = comisionError.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: comisionError.message }, { status });
    }

    if (!comision) {
      return NextResponse.json({ error: "No se encontró la comisión." }, { status: 404 });
    }

    const commissionRow = comision as Pick<
      Comision,
      "id" | "vendedor_id" | "cliente_id" | "proyecto_id" | "estado" | "monto_comision"
    > & { updated_at?: string };

    const [{ data: vendedor }, { data: cliente }] = await Promise.all([
      supabase.from("usuarios").select("nombre").eq("id", commissionRow.vendedor_id).maybeSingle(),
      supabase.from("clientes").select("empresa").eq("id", commissionRow.cliente_id).maybeSingle()
    ]);

    const concepto = `Comisión — ${vendedor?.nombre ?? "Sin vendedor"} — ${cliente?.empresa ?? "Sin cliente"}`;
    const fechaHoy = todayIsoDate();

    const { data: egresoExistente, error: egresoExistenteError } = await supabase
      .from("egresos")
      .select("id")
      .eq("comision_id", commissionRow.id)
      .maybeSingle();

    if (egresoExistenteError) {
      return NextResponse.json({ error: egresoExistenteError.message }, { status: 500 });
    }

    let egresoCreadoId: string | null = egresoExistente?.id ?? null;

    if (!egresoCreadoId) {
      const { data: nuevoEgreso, error: egresoError } = await supabase
        .from("egresos")
        .insert({
          concepto,
          categoria: "comisiones",
          monto: commissionRow.monto_comision,
          fecha: fechaHoy,
          recurrente: false,
          cuenta_medio: null,
          pagado: true,
          fecha_pago: fechaHoy,
          proyecto_id: commissionRow.proyecto_id,
          comision_id: commissionRow.id,
          notas: null
        })
        .select("id")
        .single();

      if (egresoError || !nuevoEgreso) {
        return NextResponse.json(
          { error: egresoError?.message ?? "No se pudo crear el egreso de comisión." },
          { status: 500 }
        );
      }

      egresoCreadoId = nuevoEgreso.id;
    }

    if (commissionRow.estado !== "pagada") {
      const { data: updatedCommission, error: updateError } = await supabase
        .from("comisiones")
        .update({
          estado: "pagada",
          pagada_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as never)
        .eq("id", commissionRow.id)
        .select("*")
        .single();

      if (updateError || !updatedCommission) {
        if (egresoCreadoId && !egresoExistente) {
          await supabase.from("egresos").delete().eq("id", egresoCreadoId);
        }

        return NextResponse.json(
          { error: updateError?.message ?? "No se pudo marcar la comisión como pagada." },
          { status: 500 }
        );
      }

      return NextResponse.json({ data: updatedCommission });
    }

    return NextResponse.json({ data: commissionRow });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
