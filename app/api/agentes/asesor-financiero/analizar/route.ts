import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth";
import { calcularMetricasAsesor } from "@/lib/agentes/calcularMetricasAsesor";
import { AGENTE_ASESOR_FINANCIERO_SLUG, normalizeAgenteConfig } from "@/lib/agentes/agentes";
import {
  AUTOMATIZACION_ASESOR_ENDPOINT,
  fetchAutomatizacionByEndpoint,
  marcarAutomatizacionEjecutada
} from "@/lib/agentes/automatizaciones";
import { createAdminClient } from "@/lib/supabase/admin";
import { hoyLocalString } from "@/lib/utils/fechas";
import type { AgenteAnalisis, AgenteConfigRow, AgentesDatabase } from "@/types/agentes";
import type { Cliente } from "@/types/clientes";
import type { Cobro } from "@/types/cobros";
import type { Egreso } from "@/types/egresos";
import type { Lead } from "@/types/leads";
import type { Proyecto } from "@/types/proyectos";
import type { Suscripcion } from "@/types/suscripciones";

export const maxDuration = 30;

type AnthropicResponse = {
  content?: Array<
    | {
        type: "text";
        text: string;
      }
    | {
        type: string;
      }
  >;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
  error?: {
    message?: string;
  };
};

type AnalisisContexto = {
  caja_inicial: number;
  config: {
    runway_objetivo_meses: number;
    resumen_automatico_activo: boolean;
    frecuencia_resumen: string;
  };
  metricas: ReturnType<typeof calcularMetricasAsesor>;
};

function isCronAuthorized(request: NextRequest) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    return false;
  }

  const authHeader = request.headers.get("authorization") ?? "";
  return authHeader === `Bearer ${serviceRoleKey}`;
}

function buildSystemPrompt() {
  return [
    "Sos un asesor financiero senior especializado en software factories y negocios de desarrollo a medida + SaaS.",
    "Tu trabajo es analizar los números reales de Blyndtek (una software factory de 2-3 personas) y presentar 2-4 opciones concretas de qué hacer con el excedente disponible este mes, SIEMPRE con el razonamiento y el impacto numérico de cada opción — nunca ordenás qué hacer, mostrás caminos para que el dueño decida.",
    'Si runway_estado es "estable", interpretalo como buena noticia: no hay quema neta, no corresponde decir que el runway es cero y no urge acumular caja por riesgo de agotamiento.',
    'Si runway_estado es "normal" o "agotado", recién ahí hablá de runway como indicador de prudencia o riesgo según los números.',
    "Si la capacidad disponible es baja (menos de 20%), advertí explícitamente que invertir en más leads/pauta ahora podría no tener sentido porque no hay capacidad de entrega.",
    "Si hay concentración de riesgo en un cliente, mencionalo como un punto de atención aparte, no mezclado con las opciones de inversión.",
    "Sé específico con los números que te paso, nunca inventes cifras que no te di.",
    "Respondé en español, tono profesional pero cercano, sin emojis, en 300-500 palabras."
  ].join(" ");
}

function buildUserPrompt(contexto: AnalisisContexto) {
  return [
    "Analizá estos datos reales de Blyndtek y proponé 2-4 caminos posibles para decidir qué hacer con el excedente disponible este mes.",
    "No inventes cifras. Usá únicamente los números que te paso. No des órdenes; explicá opciones con su razonamiento e impacto numérico.",
    `\n${JSON.stringify(contexto, null, 2)}`
  ].join("\n\n");
}

function extractClaudeText(payload: AnthropicResponse) {
  return payload.content
    ?.filter((block): block is { type: "text"; text: string } => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

function currentMonthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export async function POST(request: NextRequest) {
  let cronAutomationId: string | null = null;

  try {
    const cronAuthorized = isCronAuthorized(request);
    const currentUser = cronAuthorized ? null : await getCurrentUser();

    if (!cronAuthorized && (!currentUser || currentUser.rol !== "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient() as SupabaseClient<AgentesDatabase>;
    const automatizacion = cronAuthorized ? await fetchAutomatizacionByEndpoint(supabase, AUTOMATIZACION_ASESOR_ENDPOINT) : null;
    cronAutomationId = automatizacion?.id ?? null;

    if (cronAuthorized && automatizacion && !automatizacion.activa) {
      await marcarAutomatizacionEjecutada(supabase, automatizacion.id);
      return NextResponse.json({ data: { skipped: true, motivo: "automatizacion_pausada" } });
    }

    const { data: agente, error: agenteError } = await supabase
      .from("agentes")
      .select("*")
      .eq("slug", AGENTE_ASESOR_FINANCIERO_SLUG)
      .single();

    if (agenteError || !agente) {
      const status = agenteError?.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: agenteError?.message ?? "No se encontró el agente asesor financiero." }, { status });
    }

    const { data: configRows, error: configError } = await supabase
      .from("agente_config")
      .select("*")
      .eq("agente_id", agente.id);

    if (configError) {
      return NextResponse.json({ error: configError.message }, { status: 500 });
    }

    const config = normalizeAgenteConfig((configRows ?? []) as AgenteConfigRow[]);

    const [
      { data: finanzasRows, error: finanzasError },
      { data: leadsRows, error: leadsError },
      { data: clientesRows, error: clientesError },
      { data: proyectosRows, error: proyectosError },
      { data: cobrosRows, error: cobrosError },
      { data: egresosRows, error: egresosError },
      { data: suscripcionesRows, error: suscripcionesError }
    ] = await Promise.all([
      supabase.from("config_finanzas").select("*").order("updated_at", { ascending: false }).limit(1),
      supabase.from("leads").select("*"),
      supabase.from("clientes").select("*"),
      supabase.from("proyectos").select("*"),
      supabase.from("cobros").select("*"),
      supabase.from("egresos").select("*"),
      supabase.from("suscripciones").select("*")
    ]);

    const errors = [finanzasError, leadsError, clientesError, proyectosError, cobrosError, egresosError, suscripcionesError].filter(Boolean);
    if (errors.length > 0) {
      return NextResponse.json({ error: errors[0]?.message ?? "No se pudieron calcular las métricas del asesor." }, { status: 500 });
    }

    const cajaInicial = Number(finanzasRows?.[0]?.caja_inicial ?? 0);
    const leads = (leadsRows ?? []) as Lead[];
    const clientes = (clientesRows ?? []) as Cliente[];
    const proyectos = (proyectosRows ?? []) as Proyecto[];
    const cobros = (cobrosRows ?? []) as Cobro[];
    const egresos = (egresosRows ?? []) as Egreso[];
    const suscripciones = (suscripcionesRows ?? []) as Suscripcion[];

    const metricas = calcularMetricasAsesor({
      cajaInicial,
      runwayObjetivoMeses: config.runway_objetivo_meses,
      capacidadMaxima: 5,
      leads,
      clientes,
      proyectos,
      cobros,
      egresos,
      suscripciones,
      metaAdsDisponible: false,
      referenceDate: new Date()
    });

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
        max_tokens: 1400,
        temperature: 0.4,
        system: buildSystemPrompt(),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: buildUserPrompt({
                  caja_inicial: cajaInicial,
                  config,
                  metricas
                })
              }
            ]
          }
        ]
      })
    });

    const anthropicPayload = (await anthropicResponse.json()) as AnthropicResponse;
    if (!anthropicResponse.ok) {
      return NextResponse.json(
        { error: anthropicPayload.error?.message ?? "Falló el análisis con Claude." },
        { status: 500 }
      );
    }

    const analisisTexto = extractClaudeText(anthropicPayload);
    if (!analisisTexto) {
      return NextResponse.json({ error: "Claude no devolvió contenido textual." }, { status: 500 });
    }

    const tokensEntrada = anthropicPayload.usage?.input_tokens ?? null;
    const tokensSalida = anthropicPayload.usage?.output_tokens ?? null;
    const costoEstimadoUsd =
      tokensEntrada !== null || tokensSalida !== null
        ? Number((((tokensEntrada ?? 0) / 1_000_000) * 3 + ((tokensSalida ?? 0) / 1_000_000) * 15).toFixed(6))
        : null;

    const tipo: AgenteAnalisis["tipo"] = cronAuthorized ? "automatico" : "bajo_demanda";
    const { data: insertado, error: insertError } = await supabase
      .from("agente_analisis")
      .insert({
        agente_id: agente.id,
        tipo,
        datos_calculados: {
          caja_inicial: cajaInicial,
          config,
          metricas
        },
        analisis_texto: analisisTexto,
        tokens_entrada: tokensEntrada,
        tokens_salida: tokensSalida,
        costo_estimado_usd: costoEstimadoUsd,
        generado_por: currentUser?.id ?? null
      })
      .select("*")
      .single();

    if (insertError || !insertado) {
      return NextResponse.json({ error: insertError?.message ?? "No se pudo guardar el análisis." }, { status: 500 });
    }

    if (cronAuthorized && automatizacion) {
      await marcarAutomatizacionEjecutada(supabase, automatizacion.id);
    }

    return NextResponse.json({
      data: {
        analisis: insertado,
        metricas,
        agente,
        generado_automaticamente: cronAuthorized,
        periodo: hoyLocalString(currentMonthStart())
      }
    });
  } catch (error) {
    if (cronAutomationId) {
      await marcarAutomatizacionEjecutada(createAdminClient() as SupabaseClient<AgentesDatabase>, cronAutomationId).catch(() => undefined);
    }

    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
