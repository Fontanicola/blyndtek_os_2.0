import { NextRequest, NextResponse } from "next/server";
import { ensureEgresoRecurrenteInstance } from "@/lib/finanzas/egresosRecurrentes";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { hoyLocalString } from "@/lib/utils/fechas";
import type { EgresoRecurrenteConfig } from "@/types/egresos";

type RouteContext = {
  params: {
    id: string;
  };
};

function isServiceRoleAuthorized(request: NextRequest) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(serviceRoleKey && request.headers.get("authorization") === `Bearer ${serviceRoleKey}`);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const admin = await getAdminUser();
    const serviceRoleAuthorized = isServiceRoleAuthorized(request);
    if (!admin && !serviceRoleAuthorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as { month?: string; pagado?: boolean; fecha_pago?: string | null } | null;
    if (!body?.month || typeof body.pagado !== "boolean") {
      return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: config, error } = await supabase.from("egresos_recurrentes_config").select("*").eq("id", context.params.id).single();
    if (error || !config) {
      return NextResponse.json({ error: error?.message ?? "No se encontró la configuración recurrente." }, { status: 404 });
    }

    const result = await ensureEgresoRecurrenteInstance(supabase, config as EgresoRecurrenteConfig, body.month, {
      forcePagado: body.pagado,
      fechaPago: body.pagado ? body.fecha_pago ?? hoyLocalString() : null
    });

    return NextResponse.json({ data: result.egreso });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
