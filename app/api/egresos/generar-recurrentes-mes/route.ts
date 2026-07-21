import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AUTOMATIZACION_EGRESOS_RECURRENTES_ENDPOINT,
  fetchAutomatizacionByEndpoint,
  marcarAutomatizacionEjecutada
} from "@/lib/agentes/automatizaciones";
import { generarEgresosRecurrentesMes } from "@/lib/finanzas/egresosRecurrentes";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentesDatabase } from "@/types/agentes";
import type { Database } from "@/types/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

function isServiceRoleAuthorized(request: Request) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(serviceRoleKey && request.headers.get("authorization") === `Bearer ${serviceRoleKey}`);
}

export async function POST(request: Request) {
  const supabase = createAdminClient() as SupabaseClient<Database>;
  let automationId: string | null = null;

  try {
    const admin = await getAdminUser();
    const cronAuthorized = isServiceRoleAuthorized(request);
    if (!admin && !cronAuthorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as { mes?: string | null };
    const automatizacion = await fetchAutomatizacionByEndpoint(
      supabase as unknown as SupabaseClient<AgentesDatabase>,
      AUTOMATIZACION_EGRESOS_RECURRENTES_ENDPOINT
    );
    automationId = automatizacion?.id ?? null;

    if (cronAuthorized && automatizacion && !automatizacion.activa) {
      await marcarAutomatizacionEjecutada(supabase as unknown as SupabaseClient<AgentesDatabase>, automatizacion.id);
      return NextResponse.json({
        data: {
          estado: "pausado",
          month: body.mes ?? null,
          generados: 0,
          existentes: 0,
          configs: 0
        }
      });
    }

    const result = await generarEgresosRecurrentesMes(supabase, body.mes ?? null);

    if (cronAuthorized && automatizacion) {
      await marcarAutomatizacionEjecutada(supabase as unknown as SupabaseClient<AgentesDatabase>, automatizacion.id);
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    if (automationId) {
      await marcarAutomatizacionEjecutada(supabase as unknown as SupabaseClient<AgentesDatabase>, automationId).catch(() => undefined);
    }

    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
