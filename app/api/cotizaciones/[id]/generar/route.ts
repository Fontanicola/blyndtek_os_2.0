import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Cliente } from "@/types/clientes";
import type {
  Beneficio,
  Cotizacion,
  DiferenciadorBlyndtek,
  MantenimientoDetalle,
  Modulo
} from "@/types/cotizaciones";
import type { Lead } from "@/types/leads";

type RouteContext = {
  params: {
    id: string;
  };
};

type AnthropicTextBlock = {
  type: "text";
  text: string;
};

type AnthropicDocumentBlock = {
  type: "document";
  source: {
    type: "base64";
    media_type: "application/pdf";
    data: string;
  };
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

type GenerationPayload = {
  entendimiento: string;
  resumen_ejecutivo: string;
  beneficios: Beneficio[];
  modulos: Array<{
    nombre: string;
    descripcion: string;
    features: string[];
  }>;
  justificacion_precio: string;
  por_que_nosotros: DiferenciadorBlyndtek[];
  mantenimiento_detalle: MantenimientoDetalle;
};

export const maxDuration = 60;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(value: string) {
  return UUID_REGEX.test(value);
}

function normalizeFeatureList(features: string[]) {
  return features.map((feature) => feature.trim()).filter(Boolean);
}

function normalizeText(value: string | undefined, fallback: string) {
  const next = value?.trim();

  return next && next.length > 0 ? next : fallback;
}

function normalizeBenefits(beneficios: Beneficio[] | undefined, fallback: Beneficio[]) {
  const source = beneficios && beneficios.length > 0 ? beneficios : fallback;

  return source.map((beneficio) => ({
    titulo: beneficio.titulo.trim(),
    descripcion: beneficio.descripcion.trim(),
    icono: beneficio.icono.trim()
  }));
}

function normalizeDifferentiators(
  diferenciadores: DiferenciadorBlyndtek[] | undefined,
  fallback: DiferenciadorBlyndtek[]
) {
  const source = diferenciadores && diferenciadores.length > 0 ? diferenciadores : fallback;

  return source.map((item) => ({
    titulo: item.titulo.trim(),
    descripcion: item.descripcion.trim()
  }));
}

function normalizeMantenimientoDetalle(
  mantenimientoDetalle: MantenimientoDetalle | undefined,
  fallback: MantenimientoDetalle
) {
  const source = mantenimientoDetalle ?? fallback;

  return {
    incluye: source.incluye.map((entry) => ({
      categoria: entry.categoria.trim(),
      items: entry.items.map((item) => item.trim()).filter(Boolean)
    })),
    no_incluye: source.no_incluye.map((item) => item.trim()).filter(Boolean)
  };
}

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

function parseGenerationPayload(rawText: string): GenerationPayload {
  const attempts = [cleanClaudeJson(rawText), extractJsonBetweenBraces(rawText)].filter(
    (attempt): attempt is string => Boolean(attempt)
  );

  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt) as GenerationPayload;

      if (
        !parsed.entendimiento ||
        !parsed.resumen_ejecutivo ||
        !Array.isArray(parsed.beneficios) ||
        !Array.isArray(parsed.modulos) ||
        !parsed.justificacion_precio ||
        !Array.isArray(parsed.por_que_nosotros) ||
        !parsed.mantenimiento_detalle
      ) {
        continue;
      }

      return parsed;
    } catch {
      continue;
    }
  }

  console.error("Claude generation parse failed:", rawText);
  throw new Error("La respuesta de Claude no contiene JSON válido.");
}

function fallbackGeneration(cotizacion: Cotizacion): GenerationPayload {
  const userMessages = cotizacion.contexto_chat
    .filter((mensaje) => mensaje.rol === "user")
    .map((mensaje) => mensaje.contenido);
  const contextText = userMessages.join(" ").trim();
  const summaryBase =
    contextText.length > 0
      ? contextText.slice(0, 280)
      : "Proyecto digital a medida basado en los parámetros comerciales y de contexto provistos.";
  const entornoBase =
    contextText.length > 0
      ? `A partir del material relevado, se observa una operación con necesidades concretas de orden, visibilidad y automatización. Hoy seguramente hay tareas manuales, información dispersa o poca trazabilidad entre áreas, y eso hace más difícil tomar decisiones con claridad.`
      : "La información compartida permite inferir una necesidad de ordenar procesos, centralizar información y reducir fricción operativa en un sistema a medida.";

  return {
    entendimiento: `${entornoBase}\n\nEl alcance que se propone busca resolver ese escenario con una solución clara, fácil de operar y alineada al negocio, priorizando visibilidad, control y trazabilidad sin agregar complejidad innecesaria.`,
    resumen_ejecutivo: `Propuesta inicial para ${cotizacion.empresa}. ${summaryBase}`,
    beneficios: [
      {
        titulo: "Menos tareas manuales",
        descripcion:
          "Centraliza los flujos clave para que el equipo deje de depender de planillas, recordatorios sueltos o seguimiento manual.",
        icono: "automatizacion"
      },
      {
        titulo: "Más control operativo",
        descripcion:
          "Permite ver estados, pendientes y avances en un solo lugar para decidir más rápido y con menos errores.",
        icono: "datos"
      },
      {
        titulo: "Mejor seguimiento comercial y financiero",
        descripcion:
          "Ordena la información crítica del negocio para tener una lectura más clara de oportunidades, cobros y resultados.",
        icono: "finanzas"
      }
    ],
    modulos: [
      {
        nombre: "Panel de control",
        descripcion:
          "Espacio central para operar el sistema, visualizar información clave y administrar los flujos principales del negocio.",
        features: ["Vista consolidada de estados", "Accesos y permisos básicos", "Configuraciones generales"]
      },
      {
        nombre: "Gestión operativa principal",
        descripcion:
          "Módulo principal para resolver el flujo funcional más importante del negocio con trazabilidad y orden.",
        features: ["Carga y edición de registros", "Estados de seguimiento", "Historial de cambios"]
      }
    ],
    justificacion_precio: `El valor planteado resulta competitivo para una solución a medida de este alcance porque concentra en una sola implementación flujos que, en productos equivalentes, suelen resolverse con varias herramientas o licencias separadas. Blyndtek puede ofrecer este valor porque trabaja con un stack moderno que reduce tiempos de desarrollo y mantenimiento, y porque el equipo interviene de forma directa sobre el negocio del cliente sin capas innecesarias de intermediación.`,
    por_que_nosotros: [
      {
        titulo: "A medida",
        descripcion:
          "El sistema se diseña alrededor del proceso real del cliente, no al revés."
      },
      {
        titulo: "Sin licencias por usuario",
        descripcion:
          "La solución queda armada para escalar sin sumar costos innecesarios por cada usuario nuevo."
      },
      {
        titulo: "Interlocución directa",
        descripcion:
          "El equipo conversa con el decisor y baja rápido a iteraciones concretas sin burocracia."
      }
    ],
    mantenimiento_detalle: {
      incluye: [
        {
          categoria: "Infraestructura y disponibilidad",
          items: ["Hosting y base de datos gestionados", "Monitoreo básico de funcionamiento"]
        },
        {
          categoria: "Seguridad y resguardo",
          items: ["Actualizaciones de seguridad", "Respaldo de la información crítica"]
        },
        {
          categoria: "Soporte técnico",
          items: ["Corrección de bugs incluidos", "Acompañamiento para ajustes menores"]
        }
      ],
      no_incluye: [
        "Desarrollo de nuevos módulos",
        "Cambios de alcance funcional",
        "Integraciones no previstas en la propuesta"
      ]
    }
  };
}

function mergeGenerationPayload(
  generated: GenerationPayload,
  fallback: GenerationPayload
): GenerationPayload {
  return {
    entendimiento: normalizeText(generated.entendimiento, fallback.entendimiento),
    resumen_ejecutivo: normalizeText(generated.resumen_ejecutivo, fallback.resumen_ejecutivo),
    beneficios: normalizeBenefits(generated.beneficios, fallback.beneficios),
    modulos:
      generated.modulos.length > 0
        ? generated.modulos
        : fallback.modulos,
    justificacion_precio: normalizeText(
      generated.justificacion_precio,
      fallback.justificacion_precio
    ),
    por_que_nosotros: normalizeDifferentiators(
      generated.por_que_nosotros,
      fallback.por_que_nosotros
    ),
    mantenimiento_detalle: normalizeMantenimientoDetalle(
      generated.mantenimiento_detalle,
      fallback.mantenimiento_detalle
    )
  };
}

function buildSystemPrompt() {
  return `
Sos el redactor de propuestas comerciales de Blyndtek, una software factory argentina que construye sistemas a medida (Next.js, Supabase, IA) para PYMEs de LatAm. Tu trabajo es transformar el contexto de un proyecto en una propuesta de venta persuasiva y profesional, dirigida al DUEÑO o DECISOR de la empresa (no a un técnico).

Principios:
- Hablás de VALOR DE NEGOCIO, no de tecnología. "Liquidaciones automáticas a propietarios" en vez de "cron job de cálculo".
- Demostrás que entendés el problema del cliente antes de vender la solución.
- Justificás el precio sin ser defensivo.
- Tono profesional pero cercano, español rioplatense neutro. Sin promesas exageradas, sin tecnicismos innecesarios.

Qué es un buen módulo:
- Un buen módulo es una unidad funcional concreta del sistema, no una categoría vaga.
- "Gestión de clientes con ficha 360°, historial de interacciones y segmentación" es bueno.
- "Módulo de administración" es malo porque es demasiado vago.
- Cada módulo debe ser algo que el cliente pueda imaginar usando.

Granularidad:
- Proponé entre 4 y 8 módulos.
- Cada módulo con 3 a 6 features concretas.
- Las features son acciones o capacidades específicas, redactadas en lenguaje de beneficio para el cliente, no jerga técnica.
- "Notificaciones automáticas por WhatsApp cuando vence un pago" es buena feature.
- "Integración API" es mala feature.
- Ordená los módulos por prioridad de construcción: core primero, complementarios después.
- Ajustá el alcance al presupuesto y plazo dados. Si el presupuesto es bajo o el plazo es corto, proponé menos módulos pero bien definidos y realistas.

Cómo escribir el resumen ejecutivo:
- Escribí un resumen ejecutivo de 4-6 oraciones dirigido al dueño/decisor de la empresa.
- Estructura: (1) reconocé el problema o necesidad del negocio, (2) presentá la solución que se va a construir en términos de valor, no de tecnología, (3) cerrá con el impacto esperado (ahorro de tiempo, más ventas, mejor control).
- Tono profesional pero cercano, en español rioplatense neutro.
- Sin tecnicismos, sin mencionar precios ni plazos, sin promesas exageradas.

Formato de salida:
{
  "entendimiento": "string",
  "resumen_ejecutivo": "string",
  "beneficios": [
    {
      "titulo": "string",
      "descripcion": "string",
      "icono": "automatizacion | finanzas | fiscal | datos | seguridad | soporte | crecimiento"
    }
  ],
  "modulos": [
    {
      "nombre": "string",
      "descripcion": "string",
      "features": ["string", "string"]
    }
  ],
  "justificacion_precio": "string",
  "por_que_nosotros": [
    { "titulo": "string", "descripcion": "string" }
  ],
  "mantenimiento_detalle": {
    "incluye": [
      { "categoria": "string", "items": ["string"] }
    ],
    "no_incluye": ["string"]
  }
}

Reglas estrictas:
- Devolvé SOLO JSON válido.
- No incluyas markdown.
- No incluyas explicaciones fuera del JSON.
- Entre 4 y 8 módulos salvo que el alcance real justifique menos.
- Cada módulo debe tener descripción breve y features concretas.
- La propuesta completa debe sonar como algo que se le manda a un cliente real, no como un volcado técnico.
- Si el contexto menciona un sistema legado, volumen de datos o proceso manual, nombralo específicamente en el entendimiento.
- Calibrá el alcance al presupuesto y plazo. Un proyecto de USD X en Y semanas debe tener un alcance realista y coherente.

Few-shot 1:
Módulo: Gestión de clientes y oportunidades
Descripción: Centraliza el seguimiento comercial en una ficha única por cliente para que el equipo vea historial, estado y próximos pasos sin perder contexto.
Features:
- Ficha 360° con datos de contacto y notas de seguimiento
- Historial de interacciones y recordatorios automáticos
- Segmentación por estado, canal y prioridad comercial

Few-shot 2:
Módulo: Control de cobranzas y alertas
Descripción: Ordena los cobros pendientes para que el negocio vea vencimientos, pagos recibidos y alertas sin depender de planillas dispersas.
Features:
- Seguimiento de facturas pendientes y cobradas
- Alertas automáticas cuando un cobro se vence
- Vista resumida para decidir acciones de cobranza
`.trim();
}

async function fetchLinkedRubro(
  supabase: ReturnType<typeof createAdminClient>,
  cotizacion: Cotizacion
) {
  if (cotizacion.lead_id) {
    const { data } = await supabase.from("leads").select("rubro").eq("id", cotizacion.lead_id).maybeSingle();
    const lead = data as Pick<Lead, "rubro"> | null;

    return lead?.rubro ?? null;
  }

  if (cotizacion.cliente_id) {
    const { data: clienteData } = await supabase
      .from("clientes")
      .select("lead_id")
      .eq("id", cotizacion.cliente_id)
      .maybeSingle();

    const cliente = clienteData as Pick<Cliente, "lead_id"> | null;

    if (!cliente?.lead_id) {
      return null;
    }

    const { data: leadData } = await supabase
      .from("leads")
      .select("rubro")
      .eq("id", cliente.lead_id)
      .maybeSingle();

    const lead = leadData as Pick<Lead, "rubro"> | null;
    return lead?.rubro ?? null;
  }

  return null;
}

function buildPrompt(cotizacion: Cotizacion, rubro: string | null) {
  const mensajes = cotizacion.contexto_chat
    .map((mensaje) => `${mensaje.rol.toUpperCase()}: ${mensaje.contenido}`)
    .join("\n\n");
  const textAttachments = cotizacion.adjuntos
    .filter((adjunto) => adjunto.tipo !== "pdf")
    .map(
      (adjunto) =>
        `Archivo: ${adjunto.nombre}\nTipo: ${adjunto.tipo}\nContenido:\n${adjunto.contenido_texto}`
    )
    .join("\n\n");

  return `
Datos de la cotización:
- Empresa: ${cotizacion.empresa}
- Rubro del cliente: ${rubro ?? "No definido"}
- Precio total: ${cotizacion.precio_total ?? "No definido"}
- Mantenimiento mensual: ${cotizacion.mantenimiento_mensual ?? "No definido"}
- Plazo en semanas: ${cotizacion.plazo_semanas ?? "No definido"}
- Hitos: ${cotizacion.hitos
    .map((hito) => `${hito.nombre} (${hito.pct}% - USD ${hito.monto})`)
    .join(", ")}

Contexto conversacional:
${mensajes || "Sin mensajes de contexto"}

Adjuntos textuales:
${textAttachments || "Sin adjuntos textuales"}

Instrucción comercial:
Calibrá el alcance al presupuesto y plazo. Un proyecto de USD ${cotizacion.precio_total ?? "X"} en ${
    cotizacion.plazo_semanas ?? "Y"
  } semanas debe tener un alcance realista y coherente.
`.trim();
}

function normalizeGeneratedModules(modulos: GenerationPayload["modulos"]): Modulo[] {
  return modulos.map((modulo) => ({
    id: crypto.randomUUID(),
    nombre: modulo.nombre.trim(),
    descripcion: modulo.descripcion.trim(),
    features: normalizeFeatureList(modulo.features)
  }));
}

export async function POST(_request: NextRequest, { params }: RouteContext) {
  try {
    if (!isValidUuid(params.id)) {
      return NextResponse.json({ error: "ID de cotización inválido." }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Falta ANTHROPIC_API_KEY." }, { status: 500 });
    }

    const supabase = createAdminClient();
    const { data: cotizacion, error: cotizacionError } = await supabase
      .from("cotizaciones")
      .select("*")
      .eq("id", params.id)
      .single();

    if (cotizacionError) {
      const status = cotizacionError.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: cotizacionError.message }, { status });
    }

    if (!cotizacion) {
      return NextResponse.json({ error: "Cotización no encontrada." }, { status: 404 });
    }

    const currentCotizacion = cotizacion as Cotizacion;
    const rubro = await fetchLinkedRubro(supabase, currentCotizacion);
    const systemPrompt = buildSystemPrompt();
    const prompt = buildPrompt(currentCotizacion, rubro);
    const pdfDocuments = currentCotizacion.adjuntos
      .filter((adjunto) => adjunto.tipo === "pdf")
      .map<AnthropicDocumentBlock>((adjunto) => ({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: adjunto.contenido_texto
        }
      }));

    const contentBlocks: Array<AnthropicTextBlock | AnthropicDocumentBlock> = [
      ...pdfDocuments,
      {
        type: "text",
        text: prompt
      }
    ];

    let generated: GenerationPayload;

    try {
      const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 6000,
          temperature: 0.4,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: contentBlocks
            }
          ]
        })
      });

      const anthropicPayload = (await anthropicResponse.json()) as AnthropicResponse;

      if (!anthropicResponse.ok) {
        throw new Error(anthropicPayload.error?.message ?? "Falló la generación con Claude.");
      }

      const responseText = anthropicPayload.content
        ?.filter((block): block is { type: "text"; text: string } => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();

      if (!responseText) {
        throw new Error("Claude no devolvió contenido textual.");
      }

      generated = mergeGenerationPayload(parseGenerationPayload(responseText), fallbackGeneration(currentCotizacion));
    } catch {
      generated = fallbackGeneration(currentCotizacion);
    }

    const normalizedModules = normalizeGeneratedModules(generated.modulos);
    const { data: updated, error: updateError } = await supabase
      .from("cotizaciones")
      .update({
        entendimiento: generated.entendimiento.trim(),
        beneficios: generated.beneficios,
        por_que_nosotros: generated.por_que_nosotros,
        justificacion_precio: generated.justificacion_precio.trim(),
        mantenimiento_detalle: generated.mantenimiento_detalle,
        modulos: normalizedModules,
        resumen_ejecutivo: generated.resumen_ejecutivo.trim()
      })
      .eq("id", params.id)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ data: updated as Cotizacion });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
