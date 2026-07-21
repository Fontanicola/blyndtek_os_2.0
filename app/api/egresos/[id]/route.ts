import { NextRequest, NextResponse } from "next/server";
import { syncRecurrenteConfigFromInstance } from "@/lib/finanzas/egresosRecurrentes";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Egreso, UpdateEgresoInput } from "@/types/egresos";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.from("egresos").select("*").eq("id", context.params.id).single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ data: data as Egreso });
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

    const body = (await request.json()) as UpdateEgresoInput;
    const supabase = createAdminClient();
    const { data: current, error: currentError } = await supabase.from("egresos").select("*").eq("id", context.params.id).single();
    if (currentError || !current) {
      const status = currentError?.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: currentError?.message ?? "No se encontró el egreso." }, { status });
    }

    const recurrenteConfig = await syncRecurrenteConfigFromInstance(supabase, current as Egreso, body);
    if (body.recurrente === false && current.recurrente_config_id) {
      await supabase.from("egresos_recurrentes_config").update({ activo: false }).eq("id", current.recurrente_config_id);
    }

    const { data, error } = await supabase
      .from("egresos")
      .update({
        ...body,
        recurrente_config_id: body.recurrente === true ? recurrenteConfig?.id ?? current.recurrente_config_id : body.recurrente === false ? null : current.recurrente_config_id,
        recurrente: body.recurrente ?? current.recurrente
      })
      .eq("id", context.params.id)
      .select("*")
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ data: data as Egreso });
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
    const { error } = await supabase.from("egresos").delete().eq("id", context.params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
