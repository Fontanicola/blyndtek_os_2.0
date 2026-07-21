import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth";
import { formatMonthKey } from "@/lib/finanzas";
import {
  AUTOMATIZACION_CIERRE_MENSUAL_ENDPOINT,
  fetchAutomatizacionByEndpoint,
  marcarAutomatizacionEjecutada
} from "@/lib/agentes/automatizaciones";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentesDatabase } from "@/types/agentes";
import type { Database } from "@/types/supabase";
import type { Cobro } from "@/types/cobros";
import type { Egreso } from "@/types/egresos";
import type { CierreMensual } from "@/types/cierres";

export const runtime = "nodejs";
export const maxDuration = 30;

type AnthropicResponse = {
  content?: Array<{ type: "text"; text: string } | { type: string }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
  error?: {
    message?: string;
  };
};

function isCronAuthorized(request: NextRequest) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${serviceRoleKey}`;
}

function parseTargetMonth(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return formatMonthKey(new Date());
  }

  const normalized = value.trim().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

function formatMonthDisplay(monthKey: string) {
  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric"
  }).format(new Date(`${monthKey}-01T00:00:00`));
}

function extractClaudeText(payload: AnthropicResponse) {
  return payload.content
    ?.filter((block): block is { type: "text"; text: string } => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

function sumCobrosForMonth(cobros: Cobro[], monthKey: string) {
  return cobros
    .filter((cobro) => cobro.estado === "cobrado" && (cobro.fecha_cobro ?? cobro.fecha_emision ?? "").startsWith(`${monthKey}-`))
    .reduce((total, cobro) => total + cobro.monto, 0);
}

function sumEgresosForMonth(egresos: Egreso[], monthKey: string) {
  return egresos
    .filter((egreso) => egreso.pagado && (egreso.fecha_pago ?? egreso.fecha).startsWith(`${monthKey}-`))
    .reduce((total, egreso) => total + egreso.monto, 0);
}

function getPreviousMonthKey(monthKey: string) {
  const [yearValue, monthValue] = monthKey.split("-");
  const date = new Date(Number(yearValue), Number(monthValue) - 2, 1);
  return formatMonthKey(date);
}

function buildSystemPrompt() {
  return [
    "Sos un asesor financiero senior especializado en software factories y negocios de desarrollo a medida + SaaS.",
    "Tu trabajo es resumir el cierre de caja mensual de Blyndtek en 150-250 palabras, con tono profesional y cercano.",
    "Debés explicar cómo cerró el mes, comparar contra el mes anterior usando el desvío ya calculado y marcar un punto de atención si corresponde.",
    "No inventes cifras ni causas que no estén en los datos.",
    "Si hay un egreso particularmente alto o una caída fuerte de ingresos, destacalo con criterio, sin dramatizar.",
    "Respondé en español y sin emojis."
  ].join(" ");
}

function buildUserPrompt(context: Record<string, unknown>) {
  return [
    "Generá un resumen breve del cierre mensual usando solamente estos datos reales.",
    JSON.stringify(context, null, 2)
  ].join("\n\n");
}

async function ensureAutomationRow(supabase: SupabaseClient<AgentesDatabase>) {
  const existing = await fetchAutomatizacionByEndpoint(supabase, AUTOMATIZACION_CIERRE_MENSUAL_ENDPOINT);
  if (existing) {
    return existing;
  }

  const { data: agente, error: agenteError } = await supabase
    .from("agentes")
    .select("id")
    .eq("slug", "cierre-mensual")
    .single();

  if (agenteError || !agente) {
    throw new Error(agenteError?.message ?? "No se encontró el agente cierre-mensual.");
  }

  const { data, error } = await supabase
    .from("automatizaciones")
    .insert({
      agente_id: agente.id,
      nombre: "Cierre de caja mensual",
      descripcion: "Genera el resumen de caja del mes y lo deja disponible en Finanzas.",
      activa: true,
      frecuencia: "mensual",
      dia_mes: 28,
      dia_semana: null,
      hora: "18:00",
      endpoint_trigger: AUTOMATIZACION_CIERRE_MENSUAL_ENDPOINT,
      ultima_ejecucion: null
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo crear la automatización de cierre mensual.");
  }

  return data;
}

export async function POST(request: NextRequest) {
  let automationId: string | null = null;

  try {
    const cronAuthorized = isCronAuthorized(request);
    const currentUser = cronAuthorized ? null : await getCurrentUser();

    if (!cronAuthorized && (!currentUser || currentUser.rol !== "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as { mes?: string };
    const targetMonth = parseTargetMonth(body.mes);

    if (!targetMonth) {
      return NextResponse.json({ error: "Mes inválido." }, { status: 400 });
    }

    const supabase = createAdminClient() as SupabaseClient<Database>;
    const agentesSupabase = supabase as unknown as SupabaseClient<AgentesDatabase>;
    const automatizacion = await ensureAutomationRow(agentesSupabase);
    automationId = automatizacion.id;

    if (cronAuthorized && !automatizacion.activa) {
      await marcarAutomatizacionEjecutada(agentesSupabase, automatizacion.id);
      return NextResponse.json({ data: { skipped: true, motivo: "automatizacion_pausada" } });
    }

    const { data: agente, error: agenteError } = await agentesSupabase
      .from("agentes")
      .select("id, slug, nombre, tipo")
      .eq("slug", "cierre-mensual")
      .single();

    if (agenteError || !agente) {
      return NextResponse.json({ error: agenteError?.message ?? "No se encontró el agente cierre-mensual." }, { status: 500 });
    }

    const [{ data: cobrosRows, error: cobrosError }, { data: egresosRows, error: egresosError }] = await Promise.all([
      supabase.from("cobros").select("*"),
      supabase.from("egresos").select("*")
    ]);

    if (cobrosError || egresosError) {
      return NextResponse.json({ error: cobrosError?.message ?? egresosError?.message ?? "No se pudieron cargar movimientos." }, { status: 500 });
    }

    const cobros = (cobrosRows ?? []) as Cobro[];
    const egresos = (egresosRows ?? []) as Egreso[];
    const ingresosTotales = sumCobrosForMonth(cobros, targetMonth);
    const egresosTotales = sumEgresosForMonth(egresos, targetMonth);
    const margen = ingresosTotales - egresosTotales;

    const previousMonth = getPreviousMonthKey(targetMonth);
    const { data: previousCloseRow, error: previousCloseError } = await supabase
      .from("cierres_mensuales")
      .select("*")
      .eq("mes", `${previousMonth}-01`)
      .order("generado_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (previousCloseError) {
      return NextResponse.json({ error: previousCloseError.message }, { status: 500 });
    }

    const margenAnterior =
      previousCloseRow?.margen_usd ??
      (sumCobrosForMonth(cobros, previousMonth) - sumEgresosForMonth(egresos, previousMonth));

    const desvioPctVsAnterior =
      margenAnterior === 0 ? null : Number((((margen - margenAnterior) / Math.abs(margenAnterior)) * 100).toFixed(2));

    const paidEgresosTargetMonth = egresos
      .filter((egreso) => egreso.pagado && (egreso.fecha_pago ?? egreso.fecha).startsWith(`${targetMonth}-`))
      .sort((left, right) => right.monto - left.monto);
    const topEgreso = paidEgresosTargetMonth[0] ?? null;

    const context = {
      mes: targetMonth,
      mes_label: formatMonthDisplay(targetMonth),
      ingresos_totales_usd: ingresosTotales,
      egresos_totales_usd: egresosTotales,
      margen_usd: margen,
      margen_mes_anterior_usd: margenAnterior,
      desvio_pct_vs_anterior: desvioPctVsAnterior,
      egreso_mayor: topEgreso
        ? {
            concepto: topEgreso.concepto,
            categoria: topEgreso.categoria,
            monto: topEgreso.monto
          }
        : null
    };

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Falta ANTHROPIC_API_KEY." }, { status: 500 });
    }

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 800,
        temperature: 0.35,
        system: buildSystemPrompt(),
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: buildUserPrompt(context) }]
          }
        ]
      })
    });

    const anthropicPayload = (await anthropicResponse.json()) as AnthropicResponse;
    if (!anthropicResponse.ok) {
      return NextResponse.json({ error: anthropicPayload.error?.message ?? "Falló el cierre con Claude." }, { status: 500 });
    }

    const resumenTexto = extractClaudeText(anthropicPayload);
    if (!resumenTexto) {
      return NextResponse.json({ error: "Claude no devolvió contenido textual." }, { status: 500 });
    }

    const tokensEntrada = anthropicPayload.usage?.input_tokens ?? null;
    const tokensSalida = anthropicPayload.usage?.output_tokens ?? null;
    const costoGeneracionUsd =
      tokensEntrada !== null || tokensSalida !== null
        ? Number((((tokensEntrada ?? 0) / 1_000_000) * 3 + ((tokensSalida ?? 0) / 1_000_000) * 15).toFixed(6))
        : null;

    const existingMonthRow = await supabase
      .from("cierres_mensuales")
      .select("id")
      .eq("mes", `${targetMonth}-01`)
      .maybeSingle();

    if (existingMonthRow.error) {
      return NextResponse.json({ error: existingMonthRow.error.message }, { status: 500 });
    }

    let savedRow: CierreMensual | null = null;

    if (existingMonthRow.data?.id) {
      const { data, error } = await supabase
        .from("cierres_mensuales")
        .update({
          ingresos_totales_usd: ingresosTotales,
          egresos_totales_usd: egresosTotales,
          margen_usd: margen,
          desvio_pct_vs_anterior: desvioPctVsAnterior,
          resumen_texto: resumenTexto,
          tokens_entrada: tokensEntrada,
          tokens_salida: tokensSalida,
          costo_generacion_usd: costoGeneracionUsd,
          generado_at: new Date().toISOString()
        })
        .eq("id", existingMonthRow.data.id)
        .select("*")
        .single();

      if (error || !data) {
        return NextResponse.json({ error: error?.message ?? "No se pudo actualizar el cierre mensual." }, { status: 500 });
      }

      savedRow = data as CierreMensual;
    } else {
      const { data, error } = await supabase
        .from("cierres_mensuales")
        .insert({
          mes: `${targetMonth}-01`,
          ingresos_totales_usd: ingresosTotales,
          egresos_totales_usd: egresosTotales,
          margen_usd: margen,
          desvio_pct_vs_anterior: desvioPctVsAnterior,
          resumen_texto: resumenTexto,
          tokens_entrada: tokensEntrada,
          tokens_salida: tokensSalida,
          costo_generacion_usd: costoGeneracionUsd
        })
        .select("*")
        .single();

      if (error || !data) {
        return NextResponse.json({ error: error?.message ?? "No se pudo guardar el cierre mensual." }, { status: 500 });
      }

      savedRow = data as CierreMensual;
    }

    await marcarAutomatizacionEjecutada(agentesSupabase, automatizacion.id);

    return NextResponse.json({
      data: {
        cierre: savedRow,
        contexto: {
          ingresos_totales_usd: ingresosTotales,
          egresos_totales_usd: egresosTotales,
          margen_usd: margen,
          desvio_pct_vs_anterior: desvioPctVsAnterior
        }
      }
    });
  } catch (error) {
    if (automationId) {
      const supabase = createAdminClient() as unknown as SupabaseClient<AgentesDatabase>;
      await marcarAutomatizacionEjecutada(supabase, automationId).catch(() => undefined);
    }

    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
