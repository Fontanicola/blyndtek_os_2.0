import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth";
import { fetchAutomatizacionByEndpoint, marcarAutomatizacionEjecutada } from "@/lib/agentes/automatizaciones";
import { isCronistaDate } from "@/lib/agentes/cronista";
import { ejecutarReporteCronista } from "@/lib/agentes/cronista-reporte-ejecutor";
import {
  CRONISTA_REPORTE_MENSUAL_ENDPOINT,
  CRONISTA_REPORTE_SEMANAL_ENDPOINT
} from "@/lib/agentes/cronista-reportes";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentesDatabase, CronistaReporteTipo } from "@/types/agentes";

function isCronAuthorized(request: NextRequest) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(serviceRoleKey) && request.headers.get("authorization") === `Bearer ${serviceRoleKey}`;
}

export async function handleCronistaReporte(request: NextRequest, tipo: CronistaReporteTipo) {
  const supabase = createAdminClient() as SupabaseClient<AgentesDatabase>;
  let automationId: string | null = null;
  try {
    const cronAuthorized = isCronAuthorized(request);
    const currentUser = cronAuthorized ? null : await getCurrentUser();
    if (!cronAuthorized && (!currentUser || currentUser.rol !== "admin")) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const body = await request.json().catch(() => null) as { fecha_referencia?: unknown } | null;
    if (body?.fecha_referencia !== undefined && !isCronistaDate(body.fecha_referencia)) {
      return NextResponse.json({ error: "fecha_referencia debe usar YYYY-MM-DD." }, { status: 400 });
    }
    const referenceDate = typeof body?.fecha_referencia === "string"
      ? new Date(`${body.fecha_referencia}T12:00:00-03:00`)
      : undefined;
    const endpoint = tipo === "semanal" ? CRONISTA_REPORTE_SEMANAL_ENDPOINT : CRONISTA_REPORTE_MENSUAL_ENDPOINT;
    const automation = cronAuthorized ? await fetchAutomatizacionByEndpoint(supabase, endpoint) : null;
    automationId = automation?.id ?? null;
    if (cronAuthorized && automation && !automation.activa) {
      await marcarAutomatizacionEjecutada(supabase, automation.id);
      return NextResponse.json({ data: { skipped: true, motivo: "automatizacion_pausada" } });
    }

    const result = await ejecutarReporteCronista({ supabase, tipo, referenceDate });
    if (automationId) {
      await marcarAutomatizacionEjecutada(supabase, automationId);
    }
    return NextResponse.json({ data: result }, { status: result.skipped ? 200 : 201 });
  } catch (error) {
    if (automationId) {
      await marcarAutomatizacionEjecutada(supabase, automationId).catch(() => undefined);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error inesperado." },
      { status: 500 }
    );
  }
}
