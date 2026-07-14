import { NextResponse } from "next/server";
import { calculateRunwayProjection } from "@/lib/finanzas/runwayProjection";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Cobro } from "@/types/cobros";
import type { ConfigFinanzas } from "@/types/finanzas";
import type { Egreso } from "@/types/egresos";
import type { Suscripcion } from "@/types/suscripciones";

export async function GET(request: Request) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const incluirPendientes = searchParams.get("incluirPendientes") === "true";
    const supabase = createAdminClient();

    const [
      { data: configRows, error: configError },
      { data: cobrosRows, error: cobrosError },
      { data: egresosRows, error: egresosError },
      { data: suscripcionesRows, error: suscripcionesError }
    ] = await Promise.all([
      supabase.from("config_finanzas").select("*").order("updated_at", { ascending: false }).limit(1),
      supabase.from("cobros").select("*"),
      supabase.from("egresos").select("*"),
      supabase.from("suscripciones").select("*")
    ]);

    const errors = [configError, cobrosError, egresosError, suscripcionesError].filter(Boolean);
    if (errors.length > 0) {
      return NextResponse.json({ error: errors[0]?.message ?? "No se pudo calcular la proyección" }, { status: 500 });
    }

    const config = (configRows?.[0] ?? { id: "config_finanzas", caja_inicial: 0, updated_at: new Date().toISOString() }) as ConfigFinanzas;
    const cobros = (cobrosRows ?? []) as Cobro[];
    const egresos = (egresosRows ?? []) as Egreso[];
    const suscripciones = (suscripcionesRows ?? []) as Suscripcion[];

    const cajaActual =
      config.caja_inicial +
      cobros.filter((cobro) => cobro.estado === "cobrado").reduce((total, cobro) => total + cobro.monto, 0) -
      egresos.filter((egreso) => egreso.pagado).reduce((total, egreso) => total + egreso.monto, 0);

    const projection = calculateRunwayProjection(
      cajaActual,
      cobros,
      egresos,
      suscripciones,
      new Date(),
      12,
      { incluirPendientes }
    );

    return NextResponse.json({ data: projection });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
