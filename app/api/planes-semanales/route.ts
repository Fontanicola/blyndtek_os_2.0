import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrandManagerUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBlyndtekContentBrand } from "@/lib/contenido/blyndtek";
import type { ContenidoDatabase, PiezaContenido, PlanSemanal } from "@/types/contenido";

function isDateInput(value: string | null) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

async function getPlanWithPiezas(
  supabase: SupabaseClient<ContenidoDatabase>,
  marcaId: string,
  semanaInicio: string | null
) {
  let query = supabase
    .from("planes_semanales")
    .select("*")
    .eq("marca_id", marcaId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (semanaInicio) {
    query = query.eq("semana_inicio", semanaInicio);
  }

  const { data: planes, error: planError } = await query;
  if (planError) {
    throw new Error(planError.message);
  }

  const plan = (planes?.[0] as PlanSemanal | undefined) ?? null;
  if (!plan) {
    return null;
  }

  const { data: piezas, error: piezasError } = await supabase
    .from("piezas_contenido")
    .select("*, pilar:pilares_contenido(*)")
    .eq("plan_semanal_id", plan.id)
    .order("created_at", { ascending: true });

  if (piezasError) {
    throw new Error(piezasError.message);
  }

  return {
    plan,
    piezas: (piezas ?? []) as PiezaContenido[]
  };
}

export async function GET(request: Request) {
  try {
    const admin = await getBrandManagerUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient() as unknown as SupabaseClient<ContenidoDatabase>;
    const marca = await getBlyndtekContentBrand(supabase);

    if (!marca) {
      return NextResponse.json({ error: "Marca Blyndtek not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const semanaInicio = url.searchParams.get("semana_inicio");

    if (semanaInicio && !isDateInput(semanaInicio)) {
      return NextResponse.json({ error: "semana_inicio debe tener formato YYYY-MM-DD." }, { status: 400 });
    }

    const data = await getPlanWithPiezas(supabase, marca.id, semanaInicio);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
