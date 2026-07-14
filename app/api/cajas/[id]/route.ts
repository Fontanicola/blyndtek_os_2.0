import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { CAJA_COLOR_OPTIONS, getLegacyCuentaMedioValues } from "@/lib/cajas";
import type { Caja } from "@/types/cajas";

type RouteContext = {
  params: {
    id: string;
  };
};

type UpdateCajaBody = Partial<Pick<Caja, "nombre" | "color" | "activa" | "orden">>;

function isValidColor(color: string | undefined): color is string {
  return Boolean(color && CAJA_COLOR_OPTIONS.includes(color as (typeof CAJA_COLOR_OPTIONS)[number]));
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as UpdateCajaBody;
    const supabase = createAdminClient();
    const payload: UpdateCajaBody = {};

    if (typeof body.nombre === "string") {
      const nombre = body.nombre.trim();
      if (!nombre) {
        return NextResponse.json({ error: "nombre is required" }, { status: 400 });
      }
      payload.nombre = nombre;
    }

    if (typeof body.color === "string") {
      const color = body.color.trim();
      if (!isValidColor(color)) {
        return NextResponse.json({ error: "color is required" }, { status: 400 });
      }
      payload.color = color;
    }

    if (typeof body.activa === "boolean") {
      payload.activa = body.activa;
    }

    if (typeof body.orden === "number") {
      payload.orden = body.orden;
    }

    const { data, error } = await supabase
      .from("cajas")
      .update(payload)
      .eq("id", context.params.id)
      .select("*")
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ data: data as Caja });
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
    const { data: caja, error: cajaError } = await supabase
      .from("cajas")
      .select("id, slug")
      .eq("id", context.params.id)
      .maybeSingle();

    if (cajaError) {
      return NextResponse.json({ error: cajaError.message }, { status: 500 });
    }

    if (!caja) {
      return NextResponse.json({ error: "Caja not found" }, { status: 404 });
    }

    const legacyValues = getLegacyCuentaMedioValues(caja.slug);
    const matchValues = [caja.slug, ...legacyValues];

    const [cobrosCount, egresosCount] = await Promise.all([
      supabase.from("cobros").select("id", { count: "exact", head: true }).in("cuenta_medio", matchValues),
      supabase.from("egresos").select("id", { count: "exact", head: true }).in("cuenta_medio", matchValues)
    ]);

    if (cobrosCount.error) {
      return NextResponse.json({ error: cobrosCount.error.message }, { status: 500 });
    }

    if (egresosCount.error) {
      return NextResponse.json({ error: egresosCount.error.message }, { status: 500 });
    }

    const totalMovimientos = (cobrosCount.count ?? 0) + (egresosCount.count ?? 0);

    if (totalMovimientos > 0) {
      return NextResponse.json(
        {
          error: "No se puede eliminar una caja con movimientos. Desactivala en su lugar."
        },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("cajas").delete().eq("id", context.params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
