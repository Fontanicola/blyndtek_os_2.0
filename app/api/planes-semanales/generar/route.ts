import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generarPlanSemanalContenido } from "@/lib/contenido/generarPlanSemanal";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ContenidoDatabase } from "@/types/contenido";

type GenerateWeeklyPlanBody = {
  semana_inicio?: string;
};

function isDateInput(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as GenerateWeeklyPlanBody;
    const semanaInicio = body.semana_inicio;
    if (!isDateInput(semanaInicio)) {
      return NextResponse.json({ error: "semana_inicio debe tener formato YYYY-MM-DD." }, { status: 400 });
    }

    const supabase = createAdminClient() as unknown as SupabaseClient<ContenidoDatabase>;
    const created = await generarPlanSemanalContenido({
      supabase,
      semanaInicio,
      creadoPor: admin.id
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
