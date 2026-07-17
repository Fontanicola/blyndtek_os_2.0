import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildProductMonthlyMrrSeries,
  countProductActiveAtDate,
  getProductCurrentBaseMetrics,
  getProductPeriodRange
} from "@/lib/productos";
import { fechaStringAFechaLocal } from "@/lib/utils/fechas";
import type { DashboardPeriod } from "@/types/dashboard";
import type { ProductoMetricas } from "@/types/productos";
import type { Suscripcion } from "@/types/suscripciones";

type RouteContext = {
  params: {
    id: string;
  };
};

function parsePeriod(value: string | null): DashboardPeriod {
  if (value === "quarter" || value === "year") {
    return value;
  }

  return "month";
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const productId = params.id;
    const period = parsePeriod(request.nextUrl.searchParams.get("period"));
    const range = getProductPeriodRange(period);
    const supabase = createAdminClient();

    const [{ data: product, error: productError }, { data: suscripciones, error: suscripcionesError }] = await Promise.all([
      supabase.from("productos").select("id").eq("id", productId).maybeSingle(),
      supabase.from("suscripciones").select("*").eq("producto_id", productId)
    ]);

    if (productError) {
      return NextResponse.json({ error: productError.message }, { status: 500 });
    }

    if (!product) {
      return NextResponse.json({ error: "Producto not found" }, { status: 404 });
    }

    if (suscripcionesError) {
      return NextResponse.json({ error: suscripcionesError.message }, { status: 500 });
    }

    const subscriptions = (suscripciones ?? []) as Suscripcion[];
    const currentBase = getProductCurrentBaseMetrics(subscriptions, productId, range.end);
    const nuevosPeriodo = subscriptions.filter((suscripcion) => {
      if (!suscripcion.fecha_inicio) {
        return false;
      }

      const fechaInicio = fechaStringAFechaLocal(suscripcion.fecha_inicio);
      return fechaInicio >= range.start && fechaInicio < range.end;
    }).length;
    const bajasPeriodo = subscriptions.filter((suscripcion) => {
      if (suscripcion.estado !== "baja" || !suscripcion.fecha_baja) {
        return false;
      }

      const fechaBaja = fechaStringAFechaLocal(suscripcion.fecha_baja);
      return fechaBaja >= range.start && fechaBaja < range.end;
    }).length;
    const suscriptoresInicio = countProductActiveAtDate(subscriptions, productId, range.start);

    const churnPct = suscriptoresInicio > 0 ? (bajasPeriodo / suscriptoresInicio) * 100 : null;

    const data: ProductoMetricas = {
      mrr: currentBase.mrr,
      suscriptores_activos: currentBase.suscriptoresActivos,
      nuevos_periodo: nuevosPeriodo,
      bajas_periodo: bajasPeriodo,
      churn_pct: churnPct,
      historico_mrr: buildProductMonthlyMrrSeries(subscriptions, productId, 6)
    };

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
