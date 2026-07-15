import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  addMonths,
  formatMonthLabel,
  getLastMonths,
  startOfMonth
} from "@/lib/finanzas";
import { calcularEgresosPeriodo } from "@/lib/finanzas/calcularEgresosPeriodo";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Egreso } from "@/types/egresos";
import type { Suscripcion } from "@/types/suscripciones";

type RouteContext = {
  params: {
    id: string;
  };
};

type ClienteMinimo = {
  id: string;
  vendedor_id: string | null;
};

type ClienteRentabilidadPoint = {
  mes: string;
  ingresos: number;
  costos: number;
  margen: number;
};

type ClienteRentabilidadResponse = {
  ingreso_mensual_recurrente: number;
  ingreso_cobrado_periodo: number;
  costo_mensual: number;
  margen_mensual: number;
  margen_pct: number | null;
  historico_6_meses: ClienteRentabilidadPoint[];
};

async function fetchClienteWithAccess(
  supabase: ReturnType<typeof createAdminClient>,
  clienteId: string,
  currentUserId: string,
  rol: string
) {
  const { data, error } = await supabase.from("clientes").select("id, vendedor_id").eq("id", clienteId).single();

  if (error) {
    return { error: error.message, status: error.code === "PGRST116" ? 404 : 500 } as const;
  }

  const cliente = data as ClienteMinimo;

  if (rol === "comercial" && cliente.vendedor_id !== currentUserId) {
    return { error: "No autorizado.", status: 403 } as const;
  }

  if (rol !== "admin" && rol !== "comercial") {
    return { error: "No autorizado.", status: 403 } as const;
  }

  return { data: cliente } as const;
}

function isValidDate(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

function isWithinRange(date: Date, start: Date, end: Date) {
  return date >= start && date < end;
}

function getPeriodMonths(period: string | null) {
  if (period === "quarter") {
    return 3;
  }

  if (period === "year") {
    return 12;
  }

  return 1;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const access = await fetchClienteWithAccess(supabase, params.id, currentUser.id, currentUser.rol);

    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const period = request.nextUrl.searchParams.get("period");
    const periodMonths = getPeriodMonths(period);
    const today = new Date();
    const periodEnd = addMonths(startOfMonth(today), 1);
    const periodStart = startOfMonth(addMonths(today, -(periodMonths - 1)));
    const currentMonthStart = startOfMonth(today);
    const currentMonthEnd = addMonths(currentMonthStart, 1);

    const [cobrosResult, egresosResult, suscripcionesResult] = await Promise.all([
      supabase
        .from("cobros")
        .select("id, cliente_id, monto, fecha_emision, fecha_cobro, estado")
        .eq("cliente_id", params.id)
        .eq("estado", "cobrado"),
      supabase
        .from("egresos")
        .select("*")
        .eq("cliente_id", params.id),
      supabase
        .from("suscripciones")
        .select("id, cliente_id, monto_mensual, fecha_inicio, fecha_baja, estado")
        .eq("cliente_id", params.id)
    ]);

    if (cobrosResult.error) {
      return NextResponse.json({ error: cobrosResult.error.message }, { status: 500 });
    }

    if (egresosResult.error) {
      return NextResponse.json({ error: egresosResult.error.message }, { status: 500 });
    }

    if (suscripcionesResult.error) {
      return NextResponse.json({ error: suscripcionesResult.error.message }, { status: 500 });
    }

    const cobros = cobrosResult.data ?? [];
    const egresos = egresosResult.data as Egreso[];
    const suscripciones = suscripcionesResult.data as Suscripcion[];

    const ingresoMensualRecurrente = suscripciones
      .filter((suscripcion) => {
        if (suscripcion.estado !== "activa") {
          return false;
        }

        const fechaInicioOk = !suscripcion.fecha_inicio || new Date(suscripcion.fecha_inicio) <= today;
        const fechaBajaOk = !suscripcion.fecha_baja || new Date(suscripcion.fecha_baja) > today;
        return fechaInicioOk && fechaBajaOk;
      })
      .reduce((total, suscripcion) => total + suscripcion.monto_mensual, 0);

    const ingresoCobradoPeriodo = cobros
      .filter((cobro) => isValidDate(cobro.fecha_cobro ?? cobro.fecha_emision))
      .filter((cobro) => {
        const fecha = new Date(cobro.fecha_cobro ?? cobro.fecha_emision);
        return isWithinRange(fecha, periodStart, periodEnd);
      })
      .reduce((total, cobro) => total + cobro.monto, 0);

    const costosMensuales = calcularEgresosPeriodo(egresos, currentMonthStart, currentMonthEnd, params.id);
    const costoMensual = costosMensuales.reduce((total, egreso) => total + egreso.monto, 0);
    const margenMensual = ingresoMensualRecurrente - costoMensual;
    const margenPct = ingresoMensualRecurrente > 0 ? (margenMensual / ingresoMensualRecurrente) * 100 : null;

    const historico_6_meses = getLastMonths(6, today).map((monthDate) => {
      const monthStart = startOfMonth(monthDate);
      const monthEnd = addMonths(monthStart, 1);
      const ingresos = cobros
        .filter((cobro) => isValidDate(cobro.fecha_cobro ?? cobro.fecha_emision))
        .filter((cobro) => {
          const fecha = new Date(cobro.fecha_cobro ?? cobro.fecha_emision);
          return isWithinRange(fecha, monthStart, monthEnd);
        })
        .reduce((total, cobro) => total + cobro.monto, 0);
      const costos = calcularEgresosPeriodo(egresos, monthStart, monthEnd, params.id).reduce(
        (total, egreso) => total + egreso.monto,
        0
      );

      return {
        mes: formatMonthLabel(monthDate),
        ingresos,
        costos,
        margen: ingresos - costos
      } satisfies ClienteRentabilidadPoint;
    });

    const data: ClienteRentabilidadResponse = {
      ingreso_mensual_recurrente: ingresoMensualRecurrente,
      ingreso_cobrado_periodo: ingresoCobradoPeriodo,
      costo_mensual: costoMensual,
      margen_mensual: margenMensual,
      margen_pct: margenPct,
      historico_6_meses
    };

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
