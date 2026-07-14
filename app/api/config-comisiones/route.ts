import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ConfigComisiones } from "@/types/comisiones";

const DEFAULT_CONFIG: ConfigComisiones = {
  id: "config-comisiones-default",
  piso_base_usd: 0,
  tier_1_pct: 0,
  tier_2_umbral_usd: 0,
  tier_2_pct: 0,
  bono_ventas_mes_umbral: 0,
  bono_monto_usd: 0,
  updated_at: new Date(0).toISOString()
};

async function getActiveConfig(supabase: ReturnType<typeof createAdminClient>) {
  const { data, error } = await supabase
    .from("config_comisiones")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return (data?.[0] as ConfigComisiones | undefined) ?? null;
}

function parseConfigBody(body: Partial<ConfigComisiones>) {
  const next: Partial<ConfigComisiones> = {};

  if (typeof body.piso_base_usd === "number") {
    next.piso_base_usd = body.piso_base_usd;
  }

  if (typeof body.tier_1_pct === "number") {
    next.tier_1_pct = body.tier_1_pct;
  }

  if (typeof body.tier_2_umbral_usd === "number") {
    next.tier_2_umbral_usd = body.tier_2_umbral_usd;
  }

  if (typeof body.tier_2_pct === "number") {
    next.tier_2_pct = body.tier_2_pct;
  }

  if (typeof body.bono_ventas_mes_umbral === "number") {
    next.bono_ventas_mes_umbral = body.bono_ventas_mes_umbral;
  }

  if (typeof body.bono_monto_usd === "number") {
    next.bono_monto_usd = body.bono_monto_usd;
  }

  return next;
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    if (currentUser.rol !== "admin") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const supabase = createAdminClient();
    const config = await getActiveConfig(supabase);

    return NextResponse.json({ data: config ?? DEFAULT_CONFIG });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    if (currentUser.rol !== "admin") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const body = (await request.json()) as Partial<ConfigComisiones>;
    const updates = parseConfigBody(body);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No hay cambios para guardar." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const existing = await getActiveConfig(supabase);

    if (!existing) {
      const { data, error } = await supabase
        .from("config_comisiones")
        .insert({
          piso_base_usd: updates.piso_base_usd ?? 0,
          tier_1_pct: updates.tier_1_pct ?? 0,
          tier_2_umbral_usd: updates.tier_2_umbral_usd ?? 0,
          tier_2_pct: updates.tier_2_pct ?? 0,
          bono_ventas_mes_umbral: updates.bono_ventas_mes_umbral ?? 0,
          bono_monto_usd: updates.bono_monto_usd ?? 0
        } as never)
        .select("*")
        .single();

      if (error || !data) {
        return NextResponse.json({ error: error?.message ?? "No se pudo guardar la configuración." }, { status: 500 });
      }

      return NextResponse.json({ data });
    }

    const { data, error } = await supabase
      .from("config_comisiones")
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      } as never)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "No se pudo guardar la configuración." }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
