import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Diagnostico, ModuloCatalogo, PreguntaDiagnostico } from "@/types/diagnostico";

type RouteContext = {
  params: {
    token: string;
  };
};

type AnthropicTextBlock = {
  type: "text";
  text: string;
};

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
  error?: {
    message?: string;
  };
};

type DiagnosticoConLead = Diagnostico & {
  lead?: {
    id: string;
    empresa: string;
    contacto_1_nombre: string | null;
    vendedor_id: string | null;
  } | null;
};

type ClaudeHallazgo = {
  hallazgo: string;
  impacto: string;
  que_resolveria: string;
};

type ClaudeModulo = {
  modulo_id: string;
  justificacion: string;
};

type ClaudeInformePayload = {
  hallazgos: ClaudeHallazgo[];
  modulos_elegidos: ClaudeModulo[];
};

type ModuloSugerido = {
  modulo_id: string;
  nombre: string;
  descripcion: string | null;
  categoria: string | null;
  precio_ideal: number;
  precio_minimo: number;
  incremento_mensual: number;
  justificacion: string;
};

function cleanClaudeJson(rawText: string) {
  return rawText
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function extractJsonBetweenBraces(rawText: string) {
  const start = rawText.indexOf("{");
  const end = rawText.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return rawText.slice(start, end + 1).trim();
}

function isClaudeInformePayload(value: unknown): value is ClaudeInformePayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const payload = value as Partial<ClaudeInformePayload>;

  return Array.isArray(payload.hallazgos) && Array.isArray(payload.modulos_elegidos);
}

function parseClaudeInforme(rawText: string): ClaudeInformePayload {
  const attempts = [cleanClaudeJson(rawText), extractJsonBetweenBraces(rawText)].filter(
    (attempt): attempt is string => Boolean(attempt)
  );

  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt) as unknown;

      if (isClaudeInformePayload(parsed)) {
        return {
          hallazgos: parsed.hallazgos
            .map((hallazgo) => ({
              hallazgo: typeof hallazgo.hallazgo === "string" ? hallazgo.hallazgo.trim() : "",
              impacto: typeof hallazgo.impacto === "string" ? hallazgo.impacto.trim() : "",
              que_resolveria:
                typeof hallazgo.que_resolveria === "string" ? hallazgo.que_resolveria.trim() : ""
            }))
            .filter((hallazgo) => hallazgo.hallazgo && hallazgo.impacto && hallazgo.que_resolveria)
            .slice(0, 5),
          modulos_elegidos: parsed.modulos_elegidos
            .map((modulo) => ({
              modulo_id: typeof modulo.modulo_id === "string" ? modulo.modulo_id.trim() : "",
              justificacion: typeof modulo.justificacion === "string" ? modulo.justificacion.trim() : ""
            }))
            .filter((modulo) => modulo.modulo_id && modulo.justificacion)
        };
      }
    } catch {
      continue;
    }
  }

  throw new Error("Claude no devolvió un informe JSON válido.");
}

function buildSystemPrompt() {
  return [
    "Sos un consultor senior en digitalización de PyMEs.",
    "Analizás respuestas cualitativas y proponés sistemas operativos concretos.",
    "Nunca inventes datos, volúmenes, dinero ni procesos que no estén en las respuestas.",
    "No inventes módulos: elegí únicamente del catálogo real provisto por modulo_id.",
    "Respondé SOLO con JSON válido, sin markdown, sin texto adicional."
  ].join(" ");
}

function buildPrompt({
  empresa,
  respuestas,
  modulos
}: {
  empresa: string | null;
  respuestas: Array<{ categoria: string; pregunta: string; respuesta: string }>;
  modulos: ModuloCatalogo[];
}) {
  const respuestasTexto = respuestas
    .map((item) => `- [${item.categoria}] ${item.pregunta}\n  Respuesta: ${item.respuesta}`)
    .join("\n");
  const modulosTexto = modulos
    .map((modulo) =>
      [
        `- modulo_id: ${modulo.id}`,
        `  nombre: ${modulo.nombre}`,
        `  descripcion: ${modulo.descripcion ?? "Sin descripción"}`,
        `  categoria: ${modulo.categoria ?? "Sin categoría"}`
      ].join("\n")
    )
    .join("\n");

  return [
    "Analizá estas respuestas de un diagnóstico operativo y generá:",
    "1. Entre 3 y 5 HALLAZGOS, cada uno con EXACTAMENTE esta estructura: { hallazgo: 'el proceso actual en una frase', impacto: 'tiempo perdido/plata/riesgo concreto, con número si las respuestas lo permiten', que_resolveria: 'qué parte de un sistema atacaría esto' }.",
    "2. Una lista de MÓDULOS NECESARIOS, eligiendo ÚNICAMENTE de este catálogo real. Para cada módulo elegido, devolvé modulo_id y justificacion de una frase conectándolo a algo específico que la persona respondió.",
    "NO inventes módulos que no estén en la lista dada.",
    'Respondé SOLO con JSON: { "hallazgos": [...], "modulos_elegidos": [{ "modulo_id": "...", "justificacion": "..." }] }',
    `Empresa: ${empresa ?? "Sin empresa cargada"}`,
    `Respuestas:\n${respuestasTexto || "- Sin respuestas con contenido"}`,
    `Catálogo real de módulos:\n${modulosTexto}`
  ].join("\n\n");
}

function mapRespuestas(
  respuestas: Record<string, string> | null,
  preguntas: PreguntaDiagnostico[]
) {
  return preguntas
    .map((pregunta) => ({
      categoria: pregunta.categoria,
      pregunta: pregunta.pregunta,
      respuesta: respuestas?.[pregunta.id]?.trim() ?? ""
    }))
    .filter((item) => item.respuesta.length > 0);
}

function resolveModulos(
  elegidos: ClaudeModulo[],
  catalogo: ModuloCatalogo[]
): ModuloSugerido[] {
  const catalogoPorId = new Map(catalogo.map((modulo) => [modulo.id, modulo]));
  const seen = new Set<string>();

  return elegidos.flatMap((elegido) => {
    if (seen.has(elegido.modulo_id)) {
      return [];
    }

    const modulo = catalogoPorId.get(elegido.modulo_id);

    if (!modulo) {
      return [];
    }

    seen.add(elegido.modulo_id);

    return [
      {
        modulo_id: modulo.id,
        nombre: modulo.nombre,
        descripcion: modulo.descripcion,
        categoria: modulo.categoria,
        precio_ideal: Number(modulo.precio_ideal ?? 0),
        precio_minimo: Number(modulo.precio_minimo ?? 0),
        incremento_mensual: Number(modulo.incremento_mensual ?? 0),
        justificacion: elegido.justificacion
      }
    ];
  });
}

function sum(items: ModuloSugerido[], key: "precio_ideal" | "precio_minimo" | "incremento_mensual") {
  return items.reduce((total, item) => total + Number(item[key] ?? 0), 0);
}

export async function POST(_request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const token = params.token.trim();

    if (!token) {
      return NextResponse.json({ error: "Diagnóstico no encontrado." }, { status: 404 });
    }

    const supabase = createAdminClient();
    const { data: diagnostico, error: diagnosticoError } = await supabase
      .from("diagnosticos")
      .select("*, lead:leads(id, empresa, contacto_1_nombre, vendedor_id)")
      .eq("token_publico", token)
      .maybeSingle<DiagnosticoConLead>();

    if (diagnosticoError) {
      return NextResponse.json({ error: diagnosticoError.message }, { status: 500 });
    }

    if (!diagnostico) {
      return NextResponse.json({ error: "Diagnóstico no encontrado." }, { status: 404 });
    }

    if (
      currentUser.rol !== "admin" &&
      (currentUser.rol !== "comercial" || diagnostico.lead?.vendedor_id !== currentUser.id)
    ) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const [{ data: preguntas, error: preguntasError }, { data: modulos, error: modulosError }] =
      await Promise.all([
        supabase
          .from("preguntas_diagnostico")
          .select("*")
          .eq("activa", true)
          .order("categoria", { ascending: true })
          .order("orden", { ascending: true })
          .returns<PreguntaDiagnostico[]>(),
        supabase
          .from("modulos_catalogo")
          .select("*")
          .eq("activo", true)
          .order("categoria", { ascending: true })
          .order("nombre", { ascending: true })
          .returns<ModuloCatalogo[]>()
      ]);

    if (preguntasError) {
      return NextResponse.json({ error: preguntasError.message }, { status: 500 });
    }

    if (modulosError) {
      return NextResponse.json({ error: modulosError.message }, { status: 500 });
    }

    const respuestas = mapRespuestas(diagnostico.respuestas, preguntas ?? []);

    if (respuestas.length === 0) {
      return NextResponse.json(
        { error: "El diagnóstico todavía no tiene respuestas para analizar." },
        { status: 400 }
      );
    }

    if ((modulos ?? []).length === 0) {
      return NextResponse.json(
        { error: "No hay módulos activos en el catálogo para armar la propuesta." },
        { status: 400 }
      );
    }

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
        max_tokens: 1800,
        temperature: 0.2,
        system: buildSystemPrompt(),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: buildPrompt({
                  empresa: diagnostico.lead?.empresa ?? null,
                  respuestas,
                  modulos: modulos ?? []
                })
              } satisfies AnthropicTextBlock
            ]
          }
        ]
      })
    });

    const anthropicPayload = (await anthropicResponse.json()) as AnthropicResponse;

    if (!anthropicResponse.ok) {
      return NextResponse.json(
        { error: anthropicPayload.error?.message ?? "Falló la generación con Claude." },
        { status: 500 }
      );
    }

    const responseText = anthropicPayload.content
      ?.filter((block): block is { type: "text"; text: string } => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (!responseText) {
      return NextResponse.json({ error: "Claude no devolvió contenido textual." }, { status: 500 });
    }

    const parsed = parseClaudeInforme(responseText);
    const modulosSugeridos = resolveModulos(parsed.modulos_elegidos, modulos ?? []);

    if (modulosSugeridos.length === 0) {
      return NextResponse.json(
        { error: "Claude no eligió ningún módulo válido del catálogo real." },
        { status: 500 }
      );
    }

    const precioIdealDesarrollo = sum(modulosSugeridos, "precio_ideal");
    const precioMinimoDesarrollo = sum(modulosSugeridos, "precio_minimo");
    const precioMensual = sum(modulosSugeridos, "incremento_mensual");

    const updatePayload = {
      informe_hallazgos: parsed.hallazgos,
      modulos_sugeridos: modulosSugeridos,
      precio_ideal_desarrollo: precioIdealDesarrollo,
      precio_minimo_desarrollo: precioMinimoDesarrollo,
      precio_ideal_mensual: precioMensual,
      precio_minimo_mensual: precioMensual,
      estado: "informe_generado"
    };

    const { data: updatedDiagnostico, error: updateError } = await supabase
      .from("diagnosticos")
      .update(updatePayload)
      .eq("id", diagnostico.id)
      .select("*")
      .single();

    if (updateError || !updatedDiagnostico) {
      return NextResponse.json(
        { error: updateError?.message ?? "No se pudo guardar el informe." },
        { status: 500 }
      );
    }

    const { error: leadUpdateError } = await supabase
      .from("leads")
      .update({
        monto_propuesto_desarrollo: precioIdealDesarrollo,
        monto_propuesto_mensual: precioMensual > 0 ? precioMensual : null
      })
      .eq("id", diagnostico.lead_id);

    if (leadUpdateError) {
      return NextResponse.json({ error: leadUpdateError.message }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        diagnostico: updatedDiagnostico as Diagnostico,
        informe_hallazgos: parsed.hallazgos,
        modulos_sugeridos: modulosSugeridos,
        precio_ideal_desarrollo: precioIdealDesarrollo,
        precio_minimo_desarrollo: precioMinimoDesarrollo,
        precio_ideal_mensual: precioMensual,
        precio_minimo_mensual: precioMensual,
        informe_url: `/diagnostico/${token}/informe`
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
