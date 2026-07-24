import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { DIAGNOSTICO_CONTEXTO_KEY, type Diagnostico, type ModuloCatalogo, type PreguntaDiagnostico } from "@/types/diagnostico";

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
  evidencia?: string;
  severidad?: string;
};

type ClaudeModulo = {
  modulo_id: string;
  justificacion: string;
  problema_resuelve?: string;
  impacto_esperado?: string;
  funcionalidades?: string[];
  tiempo_estimado_semanas?: number;
  prioridad?: string;
};

type ClaudeInformePayload = {
  diagnostico_empresa?: {
    resumen_ejecutivo?: string;
    operativa_actual?: string;
    problemas_principales?: string[];
    costo_de_no_cambiar?: string;
    oportunidades_mejora?: string[];
    conclusion_diagnostico?: string;
  };
  hallazgos: ClaudeHallazgo[];
  modulos_elegidos: ClaudeModulo[];
  propuesta_software?: {
    vision_sistema?: string;
    alcance_general?: string;
    beneficios_esperados?: string[];
    roadmap_implementacion?: Array<{
      etapa?: string;
      descripcion?: string;
      duracion_estimada?: string;
    }>;
    supuestos?: string[];
    proximos_pasos?: string[];
  };
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
  problema_resuelve?: string;
  impacto_esperado?: string;
  funcionalidades?: string[];
  tiempo_estimado_semanas?: number | null;
  prioridad?: string | null;
};

const MODULOS_CATALOGO_DEFAULT: Array<Omit<ModuloCatalogo, "id" | "created_at">> = [
  {
    nombre: "CRM comercial y seguimiento",
    descripcion: "Gestión de consultas, clientes potenciales, estados de seguimiento, próximos pasos y trazabilidad comercial.",
    categoria: "Comercial",
    precio_ideal: 1800,
    precio_minimo: 1200,
    incremento_mensual: 150,
    activo: true
  },
  {
    nombre: "Gestión de pedidos y operaciones",
    descripcion: "Carga, seguimiento y priorización de pedidos u órdenes internas desde que entran hasta que se resuelven.",
    categoria: "Operación",
    precio_ideal: 2200,
    precio_minimo: 1500,
    incremento_mensual: 180,
    activo: true
  },
  {
    nombre: "Agenda, turnos y recordatorios",
    descripcion: "Calendario operativo con vencimientos, recordatorios, responsables y alertas para no perder tareas críticas.",
    categoria: "Operación",
    precio_ideal: 1500,
    precio_minimo: 950,
    incremento_mensual: 120,
    activo: true
  },
  {
    nombre: "Inventario y stock",
    descripcion: "Control de productos, movimientos, mínimos, faltantes y alertas para evitar quiebres o compras desordenadas.",
    categoria: "Operación",
    precio_ideal: 2400,
    precio_minimo: 1600,
    incremento_mensual: 180,
    activo: true
  },
  {
    nombre: "Facturación, cobranzas y pagos",
    descripcion: "Registro de facturas, cobros pendientes, pagos recibidos, vencimientos y estado financiero por cliente o pedido.",
    categoria: "Finanzas",
    precio_ideal: 2100,
    precio_minimo: 1400,
    incremento_mensual: 160,
    activo: true
  },
  {
    nombre: "Dashboard de gestión",
    descripcion: "Panel ejecutivo con métricas clave, indicadores de operación, ventas, finanzas y alertas accionables.",
    categoria: "Control",
    precio_ideal: 1800,
    precio_minimo: 1200,
    incremento_mensual: 150,
    activo: true
  },
  {
    nombre: "Portal interno multiusuario",
    descripcion: "Accesos por rol, permisos, perfiles de usuario y vistas diferenciadas para equipo, administración y dirección.",
    categoria: "Plataforma",
    precio_ideal: 1700,
    precio_minimo: 1100,
    incremento_mensual: 140,
    activo: true
  },
  {
    nombre: "Automatizaciones y notificaciones",
    descripcion: "Flujos automáticos para avisos, cambios de estado, recordatorios y tareas recurrentes conectadas al proceso real.",
    categoria: "Automatización",
    precio_ideal: 1900,
    precio_minimo: 1250,
    incremento_mensual: 170,
    activo: true
  }
];

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
                typeof hallazgo.que_resolveria === "string" ? hallazgo.que_resolveria.trim() : "",
              evidencia: typeof hallazgo.evidencia === "string" ? hallazgo.evidencia.trim() : "",
              severidad: typeof hallazgo.severidad === "string" ? hallazgo.severidad.trim() : ""
            }))
            .filter((hallazgo) => hallazgo.hallazgo && hallazgo.impacto && hallazgo.que_resolveria)
            .slice(0, 5),
          modulos_elegidos: parsed.modulos_elegidos
            .map((modulo) => ({
              modulo_id: typeof modulo.modulo_id === "string" ? modulo.modulo_id.trim() : "",
              justificacion: typeof modulo.justificacion === "string" ? modulo.justificacion.trim() : "",
              problema_resuelve:
                typeof modulo.problema_resuelve === "string" ? modulo.problema_resuelve.trim() : "",
              impacto_esperado:
                typeof modulo.impacto_esperado === "string" ? modulo.impacto_esperado.trim() : "",
              funcionalidades: Array.isArray(modulo.funcionalidades)
                ? modulo.funcionalidades.filter(
                    (value): value is string => typeof value === "string" && value.trim().length > 0
                  )
                : [],
              tiempo_estimado_semanas:
                typeof modulo.tiempo_estimado_semanas === "number" ? modulo.tiempo_estimado_semanas : undefined,
              prioridad: typeof modulo.prioridad === "string" ? modulo.prioridad.trim() : ""
            }))
            .filter((modulo) => modulo.modulo_id && modulo.justificacion),
          diagnostico_empresa: parsed.diagnostico_empresa,
          propuesta_software: parsed.propuesta_software
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
    "Blyndtek vende salto digital, automatización y sistemas operativos a medida para PyMEs. Pensá como si estuvieras instalando maquinaria moderna en una empresa que todavía opera con procesos manuales.",
    "Tu objetivo comercial es que el cliente entienda con claridad su situación actual, vea el costo de seguir igual y perciba que Blyndtek puede resolverlo con software a medida.",
    "La salida tiene que sentirse como un informe consultivo profesional y una propuesta ejecutiva completa: específica, jerárquica, detallada, persuasiva y accionable.",
    "Nunca inventes datos, volúmenes, dinero ni procesos que no estén en las respuestas.",
    "No inventes módulos: elegí únicamente del catálogo real provisto por modulo_id.",
    "Elegí entre 3 y 6 módulos si las respuestas lo justifican. No elijas módulos por cantidad: cada módulo tiene que conectarse con una respuesta concreta.",
    "Respondé SOLO con JSON válido, sin markdown, sin texto adicional."
  ].join(" ");
}

function buildPrompt({
  empresa,
  respuestas,
  contextoAdicional,
  modulos
}: {
  empresa: string | null;
  respuestas: Array<{ categoria: string; pregunta: string; respuesta: string }>;
  contextoAdicional: string;
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
    "Analizá estas respuestas de un diagnóstico operativo y generá DOS piezas conectadas:",
    "A. Informe de diagnóstico de empresa: descripción de operativa actual, problemas, costo de no cambiar, oportunidades de mejora y conclusión.",
    "B. Propuesta de software: visión del sistema recomendado, módulos, impacto de cada módulo, funcionalidades, prioridad, tiempos estimados y roadmap.",
    "Los textos tienen que ser suficientemente detallados para que el cliente se reconozca en el diagnóstico y entienda por qué necesita digitalizarse.",
    "No uses frases genéricas tipo 'mejorar eficiencia' sin explicar qué cambiaría concretamente en su operación.",
    "Hallazgos: entre 4 y 7, cada uno con { hallazgo, evidencia, impacto, severidad, que_resolveria }.",
    "Módulos: elegí ÚNICAMENTE del catálogo real. Para cada módulo devolvé modulo_id, justificacion, problema_resuelve, impacto_esperado, funcionalidades (4 a 7 bullets), tiempo_estimado_semanas y prioridad.",
    "Priorizá módulos que resuelvan dolores repetidos, pérdidas de seguimiento, desorden operativo, errores manuales, falta de trazabilidad, cobranzas o stock.",
    "NO inventes módulos que no estén en la lista dada.",
    'Respondé SOLO con JSON: { "diagnostico_empresa": { "resumen_ejecutivo": "...", "operativa_actual": "...", "problemas_principales": ["..."], "costo_de_no_cambiar": "...", "oportunidades_mejora": ["..."], "conclusion_diagnostico": "..." }, "hallazgos": [...], "modulos_elegidos": [{ "modulo_id": "...", "justificacion": "...", "problema_resuelve": "...", "impacto_esperado": "...", "funcionalidades": ["..."], "tiempo_estimado_semanas": 2, "prioridad": "Alta" }], "propuesta_software": { "vision_sistema": "...", "alcance_general": "...", "beneficios_esperados": ["..."], "roadmap_implementacion": [{ "etapa": "...", "descripcion": "...", "duracion_estimada": "..." }], "supuestos": ["..."], "proximos_pasos": ["..."] } }',
    `Empresa: ${empresa ?? "Sin empresa cargada"}`,
    `Contexto adicional escrito por Blyndtek para orientar a la IA:\n${contextoAdicional || "- Sin contexto adicional"}`,
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

function getContextoAdicional(respuestas: Record<string, string> | null) {
  return respuestas?.[DIAGNOSTICO_CONTEXTO_KEY]?.trim() ?? "";
}

function resolveModulos(
  elegidos: ClaudeModulo[],
  catalogo: ModuloCatalogo[]
): ModuloSugerido[] {
  const catalogoPorId = new Map(catalogo.map((modulo) => [modulo.id, modulo]));
  const catalogoPorNombre = new Map(catalogo.map((modulo) => [modulo.nombre.toLowerCase(), modulo]));
  const seen = new Set<string>();

  return elegidos.flatMap((elegido) => {
    const modulo = catalogoPorId.get(elegido.modulo_id) ?? catalogoPorNombre.get(elegido.modulo_id.toLowerCase());

    if (!modulo || seen.has(modulo.id)) {
      return [];
    }

    seen.add(modulo.id);

    return [
      {
        modulo_id: modulo.id,
        nombre: modulo.nombre,
        descripcion: modulo.descripcion,
        categoria: modulo.categoria,
        precio_ideal: Number(modulo.precio_ideal ?? 0),
        precio_minimo: Number(modulo.precio_minimo ?? 0),
        incremento_mensual: Number(modulo.incremento_mensual ?? 0),
        justificacion: elegido.justificacion,
        problema_resuelve: elegido.problema_resuelve,
        impacto_esperado: elegido.impacto_esperado,
        funcionalidades: elegido.funcionalidades,
        tiempo_estimado_semanas: elegido.tiempo_estimado_semanas ?? null,
        prioridad: elegido.prioridad ?? null
      }
    ];
  });
}

function buildFallbackHallazgos(
  respuestas: Array<{ categoria: string; pregunta: string; respuesta: string }>
): ClaudeHallazgo[] {
  return respuestas.slice(0, 5).map((item) => ({
    hallazgo: `${item.categoria}: ${item.pregunta}`,
    evidencia: item.respuesta,
    impacto: item.respuesta,
    severidad: "Media",
    que_resolveria: "Un sistema a medida permitiría ordenar este flujo, dejar trazabilidad y reducir dependencia de seguimiento manual."
  }));
}

function buildFallbackModulos(
  respuestas: Array<{ categoria: string; pregunta: string; respuesta: string }>,
  catalogo: ModuloCatalogo[]
): ModuloSugerido[] {
  const texto = respuestas.map((item) => `${item.categoria} ${item.pregunta} ${item.respuesta}`).join(" ").toLowerCase();
  const keywords: Array<{ test: string[]; match: string }> = [
    { test: ["pedido", "orden", "operacion", "operación", "entrega"], match: "Gestión de pedidos y operaciones" },
    { test: ["stock", "inventario", "producto", "faltante"], match: "Inventario y stock" },
    { test: ["whatsapp", "consulta", "cliente", "seguimiento", "venta"], match: "CRM comercial y seguimiento" },
    { test: ["factura", "cobro", "pago", "vencimiento"], match: "Facturación, cobranzas y pagos" },
    { test: ["recordatorio", "agenda", "turno", "fecha"], match: "Agenda, turnos y recordatorios" },
    { test: ["reporte", "indicador", "control", "métrica", "metrica"], match: "Dashboard de gestión" },
    { test: ["usuario", "rol", "permiso", "equipo"], match: "Portal interno multiusuario" },
    { test: ["automático", "automatico", "aviso", "notificación", "notificacion"], match: "Automatizaciones y notificaciones" }
  ];
  const selectedNames = new Set<string>();

  for (const keyword of keywords) {
    if (keyword.test.some((word) => texto.includes(word))) {
      selectedNames.add(keyword.match);
    }
  }

  if (selectedNames.size < 3) {
    for (const modulo of catalogo) {
      selectedNames.add(modulo.nombre);
      if (selectedNames.size >= 3) {
        break;
      }
    }
  }

  return catalogo
    .filter((modulo) => selectedNames.has(modulo.nombre))
    .slice(0, 6)
    .map((modulo) => ({
      modulo_id: modulo.id,
      nombre: modulo.nombre,
      descripcion: modulo.descripcion,
      categoria: modulo.categoria,
      precio_ideal: Number(modulo.precio_ideal ?? 0),
      precio_minimo: Number(modulo.precio_minimo ?? 0),
      incremento_mensual: Number(modulo.incremento_mensual ?? 0),
      justificacion: "Seleccionado por los dolores operativos detectados en las respuestas del diagnóstico.",
      problema_resuelve: "Desorden operativo y dependencia de seguimiento manual.",
      impacto_esperado: "Más trazabilidad, menos errores y mejor capacidad de control para la dirección.",
      funcionalidades: [
        "Registro centralizado de información",
        "Estados claros por proceso",
        "Responsables y próximos pasos",
        "Alertas y seguimiento operativo"
      ],
      tiempo_estimado_semanas: 2,
      prioridad: "Alta"
    }));
}

function sum(items: ModuloSugerido[], key: "precio_ideal" | "precio_minimo" | "incremento_mensual") {
  return items.reduce((total, item) => total + Number(item[key] ?? 0), 0);
}

async function fetchOrBootstrapModulos(supabase: ReturnType<typeof createAdminClient>) {
  const { data: activeModulos, error: activeError } = await supabase
    .from("modulos_catalogo")
    .select("*")
    .eq("activo", true)
    .order("categoria", { ascending: true })
    .order("nombre", { ascending: true })
    .returns<ModuloCatalogo[]>();

  if (activeError) {
    throw new Error(activeError.message);
  }

  if ((activeModulos ?? []).length > 0) {
    return activeModulos ?? [];
  }

  const { count: catalogCount, error: countError } = await supabase
    .from("modulos_catalogo")
    .select("*", { count: "exact", head: true });

  if (countError) {
    throw new Error(countError.message);
  }

  if (Number(catalogCount ?? 0) === 0) {
    const { error: insertError } = await supabase.from("modulos_catalogo").insert(MODULOS_CATALOGO_DEFAULT);

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  const { data: nextModulos, error: nextError } = await supabase
    .from("modulos_catalogo")
    .select("*")
    .eq("activo", true)
    .order("categoria", { ascending: true })
    .order("nombre", { ascending: true })
    .returns<ModuloCatalogo[]>();

  if (nextError) {
    throw new Error(nextError.message);
  }

  return nextModulos ?? [];
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

    const [{ data: preguntas, error: preguntasError }, modulos] = await Promise.all([
      supabase
        .from("preguntas_diagnostico")
        .select("*")
        .eq("activa", true)
        .order("categoria", { ascending: true })
        .order("orden", { ascending: true })
        .returns<PreguntaDiagnostico[]>(),
      fetchOrBootstrapModulos(supabase)
    ]);

    if (preguntasError) {
      return NextResponse.json({ error: preguntasError.message }, { status: 500 });
    }

    const respuestas = mapRespuestas(diagnostico.respuestas, preguntas ?? []);
    const contextoAdicional = getContextoAdicional(diagnostico.respuestas);

    if (respuestas.length === 0) {
      return NextResponse.json(
        { error: "El diagnóstico todavía no tiene respuestas para analizar." },
        { status: 400 }
      );
    }

    if (modulos.length === 0) {
      return NextResponse.json(
        { error: "No hay módulos disponibles en el catálogo para armar la propuesta." },
        { status: 409 }
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
        max_tokens: 5000,
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
                  contextoAdicional,
                  modulos
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
    const hallazgos = parsed.hallazgos.length > 0 ? parsed.hallazgos : buildFallbackHallazgos(respuestas);
    const resolvedModulos = resolveModulos(parsed.modulos_elegidos, modulos);
    const modulosSugeridos =
      resolvedModulos.length > 0 ? resolvedModulos : buildFallbackModulos(respuestas, modulos);

    const precioIdealDesarrollo = sum(modulosSugeridos, "precio_ideal");
    const precioMinimoDesarrollo = sum(modulosSugeridos, "precio_minimo");
    const precioMensual = sum(modulosSugeridos, "incremento_mensual");

    const informeDiagnosticoPayload = {
      diagnostico_empresa: parsed.diagnostico_empresa ?? {
        resumen_ejecutivo: "El diagnóstico muestra una operación con oportunidades claras de digitalización.",
        operativa_actual: "La operación actual fue relevada a partir de las respuestas y el contexto adicional.",
        problemas_principales: hallazgos.map((hallazgo) => hallazgo.hallazgo),
        costo_de_no_cambiar: "Seguir operando sin sistema mantiene dependencia manual, pérdida de trazabilidad y riesgo de errores.",
        oportunidades_mejora: hallazgos.map((hallazgo) => hallazgo.que_resolveria),
        conclusion_diagnostico: "Hay fundamentos suficientes para avanzar con un sistema operativo a medida."
      },
      hallazgos
    };
    const propuestaPayload = {
      propuesta_software: parsed.propuesta_software ?? {
        vision_sistema: "Construir un sistema operativo propio para ordenar la operación y automatizar procesos críticos.",
        alcance_general: "El alcance inicial queda organizado por los módulos propuestos.",
        beneficios_esperados: modulosSugeridos.map((modulo) => modulo.impacto_esperado || modulo.justificacion),
        roadmap_implementacion: [
          {
            etapa: "Relevamiento y diseño funcional",
            descripcion: "Aterrizar flujos reales, roles, pantallas y prioridades.",
            duracion_estimada: "1 semana"
          },
          {
            etapa: "Construcción del sistema",
            descripcion: "Desarrollar los módulos principales y validar con datos reales.",
            duracion_estimada: "4 a 7 semanas"
          },
          {
            etapa: "Implementación",
            descripcion: "Capacitar al equipo, ajustar fricciones y dejar el sistema operando.",
            duracion_estimada: "1 a 2 semanas"
          }
        ],
        supuestos: ["El alcance final se confirma antes del inicio del desarrollo."],
        proximos_pasos: ["Revisar informe", "Validar módulos", "Cerrar alcance e iniciar proyecto"]
      },
      modulos: modulosSugeridos
    };

    const updatePayload = {
      informe_hallazgos: informeDiagnosticoPayload,
      modulos_sugeridos: propuestaPayload,
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
        informe_hallazgos: informeDiagnosticoPayload,
        modulos_sugeridos: propuestaPayload,
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
