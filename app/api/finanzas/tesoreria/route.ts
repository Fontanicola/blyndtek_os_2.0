import { NextResponse } from "next/server";
import { formatMonthKey, formatMonthLabel, getLastMonths } from "@/lib/finanzas";
import { normalizeCajaSlug } from "@/lib/cajas";
import { calcularBalanceTotalTesoreria } from "@/lib/finanzas/tesoreria";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { fechaStringAFechaLocal } from "@/lib/utils/fechas";
import type { EstadoCobro } from "@/types/cobros";
import type { Caja } from "@/types/cajas";
import type { TesoreriaCajaBalance, TesoreriaFinanzas, TesoreriaHistoricoPoint } from "@/types/finanzas";

type CobroRow = {
  monto: number;
  estado: EstadoCobro;
  caja_id: string | null;
  cuenta_medio: string | null;
  fecha_emision: string | null;
  fecha_cobro: string | null;
};

type EgresoRow = {
  monto: number;
  pagado: boolean;
  caja_id: string | null;
  cuenta_medio: string | null;
  fecha_pago: string | null;
  fecha: string;
};

type CajaRow = Pick<Caja, "id" | "nombre" | "slug" | "color" | "activa">;

type BucketBuild = TesoreriaCajaBalance & {
  historico: TesoreriaHistoricoPoint[];
};

function updateLastMovement(current: string | null, candidate: string | null) {
  if (!candidate) {
    return current;
  }

  if (!current) {
    return candidate;
  }

  const candidateDate = fechaStringAFechaLocal(candidate);
  const currentDate = fechaStringAFechaLocal(current);

  if (!candidateDate || !currentDate || Number.isNaN(candidateDate.getTime()) || Number.isNaN(currentDate.getTime())) {
    return candidate ?? current;
  }

  return candidateDate.getTime() > currentDate.getTime() ? candidate : current;
}

function getMonthKey(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = fechaStringAFechaLocal(value);
  if (!date || Number.isNaN(date.getTime())) {
    return null;
  }

  return formatMonthKey(date);
}

function buildHistoricoTemplate() {
  return getLastMonths(6).map((monthDate) => ({
    mes: formatMonthLabel(monthDate),
    cobrado: 0,
    egresado: 0
  }));
}

function makeBucket(caja: CajaRow): BucketBuild {
  return {
    id: caja.id,
    nombre: caja.nombre,
    slug: caja.slug,
    color: caja.color,
    activa: caja.activa,
    total_cobrado: 0,
    total_egresado: 0,
    balance: 0,
    ultimo_movimiento: null,
    historico: buildHistoricoTemplate()
  };
}

function makeSinAsignarBucket(): BucketBuild {
  return {
    id: null,
    nombre: "Sin asignar",
    slug: "sin_asignar",
    color: "graphite",
    activa: true,
    total_cobrado: 0,
    total_egresado: 0,
    balance: 0,
    ultimo_movimiento: null,
    historico: buildHistoricoTemplate(),
    es_sin_asignar: true
  };
}

function resolveBucketKey(
  row: { caja_id: string | null; cuenta_medio: string | null },
  cajasById: Map<string, CajaRow>,
  cajasBySlug: Map<string, CajaRow>
) {
  if (row.caja_id) {
    const cajaById = cajasById.get(row.caja_id);
    if (cajaById) {
      return cajaById.slug;
    }
  }

  const normalizedSlug = normalizeCajaSlug(row.cuenta_medio);
  if (normalizedSlug) {
    const cajaBySlug = cajasBySlug.get(normalizedSlug);
    if (cajaBySlug) {
      return cajaBySlug.slug;
    }
  }

  return "sin_asignar";
}

export async function GET() {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const [cajasResult, cobrosResult, egresosResult, configResult] = await Promise.all([
      supabase.from("cajas").select("id, nombre, slug, color, activa, orden").order("orden", { ascending: true }),
      supabase.from("cobros").select("monto, estado, caja_id, cuenta_medio, fecha_emision, fecha_cobro").eq("estado", "cobrado"),
      supabase.from("egresos").select("monto, pagado, caja_id, cuenta_medio, fecha_pago, fecha").eq("pagado", true),
      supabase.from("config_finanzas").select("caja_inicial").order("updated_at", { ascending: false }).limit(1)
    ]);

    if (cajasResult.error) {
      return NextResponse.json({ error: cajasResult.error.message }, { status: 500 });
    }

    if (cobrosResult.error) {
      return NextResponse.json({ error: cobrosResult.error.message }, { status: 500 });
    }

    if (egresosResult.error) {
      return NextResponse.json({ error: egresosResult.error.message }, { status: 500 });
    }

    if (configResult.error) {
      return NextResponse.json({ error: configResult.error.message }, { status: 500 });
    }

    const cajas = (cajasResult.data ?? []) as CajaRow[];
    const cajasById = new Map(cajas.map((caja) => [caja.id, caja] as const));
    const cajasBySlug = new Map(cajas.map((caja) => [caja.slug, caja] as const));
    const months = getLastMonths(6);
    const monthKeys = months.map((monthDate) => formatMonthKey(monthDate));
    const monthIndexByKey = new Map(monthKeys.map((key, index) => [key, index] as const));

    const buckets = new Map<string, BucketBuild>([
      ...cajas.map((caja) => [caja.slug, makeBucket(caja)] as const),
      ["sin_asignar", makeSinAsignarBucket()]
    ]);

    const cobros = (cobrosResult.data ?? []) as CobroRow[];
    const egresos = (egresosResult.data ?? []) as EgresoRow[];

    for (const cobro of cobros) {
      const key = resolveBucketKey(cobro, cajasById, cajasBySlug);
      const bucket = buckets.get(key) ?? buckets.get("sin_asignar");
      const monthKey = getMonthKey(cobro.fecha_cobro ?? cobro.fecha_emision);
      const monthIndex = monthKey ? monthIndexByKey.get(monthKey) : null;

      if (!bucket) {
        continue;
      }

      bucket.total_cobrado += cobro.monto ?? 0;
      bucket.ultimo_movimiento = updateLastMovement(bucket.ultimo_movimiento, cobro.fecha_cobro);
      if (monthIndex != null) {
        bucket.historico[monthIndex]!.cobrado += cobro.monto ?? 0;
      }
      buckets.set(key, bucket);
    }

    for (const egreso of egresos) {
      const key = resolveBucketKey(egreso, cajasById, cajasBySlug);
      const bucket = buckets.get(key) ?? buckets.get("sin_asignar");
      const monthKey = getMonthKey(egreso.fecha_pago ?? egreso.fecha);
      const monthIndex = monthKey ? monthIndexByKey.get(monthKey) : null;

      if (!bucket) {
        continue;
      }

      bucket.total_egresado += egreso.monto ?? 0;
      bucket.ultimo_movimiento = updateLastMovement(bucket.ultimo_movimiento, egreso.fecha_pago ?? egreso.fecha);
      if (monthIndex != null) {
        bucket.historico[monthIndex]!.egresado += egreso.monto ?? 0;
      }
      buckets.set(key, bucket);
    }

    const cajasBalance = [...buckets.values()]
      .filter((bucket) =>
        bucket.es_sin_asignar
          ? bucket.total_cobrado > 0 || bucket.total_egresado > 0
          : bucket.activa || bucket.total_cobrado > 0 || bucket.total_egresado > 0
      )
      .map((bucket) => ({
        ...bucket,
        balance: bucket.total_cobrado - bucket.total_egresado
      }));

    const cajaInicial = Number(configResult.data?.[0]?.caja_inicial ?? 0);
    const balanceTotal = calcularBalanceTotalTesoreria({
      cajaInicial,
      cobros: (cobrosResult.data ?? []) as CobroRow[],
      egresos: (egresosResult.data ?? []) as EgresoRow[]
    });

    const payload: TesoreriaFinanzas = {
      caja_inicial: cajaInicial,
      balance_total: balanceTotal,
      cajas: cajasBalance
    };

    return NextResponse.json({ data: payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
