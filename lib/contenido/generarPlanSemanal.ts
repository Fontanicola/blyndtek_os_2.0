import type { SupabaseClient } from "@supabase/supabase-js";
import { getBlyndtekContentBrand } from "@/lib/contenido/blyndtek";
import type { ContenidoDatabase, JsonValue, MarcaContenido, PiezaContenido, PlanSemanal } from "@/types/contenido";

type AnthropicResponse = {
  content?: Array<{ type: "text"; text: string } | { type: string }>;
  error?: { message?: string };
};

type SlideGenerado = {
  titulo_slide: string;
  texto: string;
};

type PostFeedGenerado = {
  titulo: string;
  slides: SlideGenerado[];
  caption: string;
  hashtags: string[];
};

type PostCasoUsoGenerado = PostFeedGenerado & {
  rubro: string;
};

type PostDatoRapidoGenerado = {
  titulo: string;
  texto_principal: string;
  caption: string;
  hashtags: string[];
};

type GuionReelGenerado = {
  hook: string;
  puntos: string[];
  cta: string;
  duracion_sugerida_seg: number;
  caption: string;
  hashtags: string[];
};

export type PlanGenerado = {
  tema_general: string;
  noticia_fuente: string;
  noticia_url: string;
  post_noticia: PostFeedGenerado;
  post_caso_uso: PostCasoUsoGenerado;
  post_dato_rapido: PostDatoRapidoGenerado;
  guion_reel: GuionReelGenerado;
  ideas_historias: string[];
};

export type PlanSemanalCreado = {
  plan: PlanSemanal;
  piezas: PiezaContenido[];
  contenido_generado: PlanGenerado;
};

const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const COMPETITOR_TERMS = ["santex"];

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
  return start === -1 || end === -1 || end <= start ? null : rawText.slice(start, end + 1).trim();
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function asStringArray(value: unknown, maxItems?: number) {
  const items = Array.isArray(value) ? value.map((item) => asString(item)).filter(Boolean) : [];
  return typeof maxItems === "number" ? items.slice(0, maxItems) : items;
}

function normalizeHashtags(value: unknown) {
  return asStringArray(value, 5)
    .map((tag) => {
      const normalized = tag.trim().replace(/^#+/, "");
      return normalized ? `#${normalized}` : "";
    })
    .filter(Boolean);
}

function normalizeSlides(value: unknown, fallbackTitle: string) {
  const slides = Array.isArray(value) ? value : [];
  const normalized = slides
    .map((slide, index) => {
      if (typeof slide !== "object" || slide === null) {
        return null;
      }

      const record = slide as Record<string, unknown>;
      const titulo = asString(record.titulo_slide, `Slide ${index + 1}`);
      const texto = asString(record.texto);

      return texto ? { titulo_slide: titulo, texto } : null;
    })
    .filter((slide): slide is SlideGenerado => Boolean(slide))
    .slice(0, 5);

  return normalized.length > 0 ? normalized : [{ titulo_slide: fallbackTitle, texto: "Contenido pendiente de ajuste." }];
}

function normalizeFeedPost(value: unknown, fallbackTitle: string): PostFeedGenerado {
  const record = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

  return {
    titulo: asString(record.titulo, fallbackTitle),
    slides: normalizeSlides(record.slides, fallbackTitle),
    caption: asString(record.caption),
    hashtags: normalizeHashtags(record.hashtags)
  };
}

function normalizePlan(raw: unknown): PlanGenerado {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Claude no devolvió un objeto JSON válido.");
  }

  const record = raw as Record<string, unknown>;
  const casoRecord =
    typeof record.post_caso_uso === "object" && record.post_caso_uso !== null
      ? (record.post_caso_uso as Record<string, unknown>)
      : {};
  const datoRecord =
    typeof record.post_dato_rapido === "object" && record.post_dato_rapido !== null
      ? (record.post_dato_rapido as Record<string, unknown>)
      : {};
  const reelRecord =
    typeof record.guion_reel === "object" && record.guion_reel !== null
      ? (record.guion_reel as Record<string, unknown>)
      : {};

  const plan: PlanGenerado = {
    tema_general: asString(record.tema_general),
    noticia_fuente: asString(record.noticia_fuente),
    noticia_url: asString(record.noticia_url),
    post_noticia: normalizeFeedPost(record.post_noticia, "Noticia de la semana"),
    post_caso_uso: {
      ...normalizeFeedPost(record.post_caso_uso, "Caso de uso"),
      rubro: asString(casoRecord.rubro, "PyME")
    },
    post_dato_rapido: {
      titulo: asString(datoRecord.titulo, "Dato rápido"),
      texto_principal: asString(datoRecord.texto_principal),
      caption: asString(datoRecord.caption),
      hashtags: normalizeHashtags(datoRecord.hashtags)
    },
    guion_reel: {
      hook: asString(reelRecord.hook),
      puntos: asStringArray(reelRecord.puntos).slice(0, 5),
      cta: asString(reelRecord.cta),
      duracion_sugerida_seg: Number(reelRecord.duracion_sugerida_seg) || 30,
      caption: asString(reelRecord.caption),
      hashtags: normalizeHashtags(reelRecord.hashtags)
    },
    ideas_historias: asStringArray(record.ideas_historias, 5)
  };

  if (!plan.tema_general || !plan.noticia_fuente || !plan.noticia_url) {
    throw new Error("Claude no devolvió tema_general, noticia_fuente y noticia_url completos.");
  }

  if (plan.ideas_historias.length < 5) {
    throw new Error("Claude no devolvió 5 ideas de historias.");
  }

  return plan;
}

function parsePlanPayload(rawText: string): PlanGenerado {
  const attempts = [cleanClaudeJson(rawText), extractJsonBetweenBraces(rawText)].filter(
    (attempt): attempt is string => Boolean(attempt)
  );

  for (const attempt of attempts) {
    try {
      return normalizePlan(JSON.parse(attempt));
    } catch {
      continue;
    }
  }

  throw new Error("Claude no devolvió un plan semanal JSON válido.");
}

function getTextFromClaude(payload: AnthropicResponse) {
  return payload.content
    ?.filter((block): block is { type: "text"; text: string } => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

function buildSystemPrompt() {
  return [
    "Sos estratega de contenido senior para Blyndtek.",
    "Tu trabajo es transformar noticias reales sobre IA aplicada a negocios en contenido útil para dueños de PyME.",
    "Respondé siempre con JSON válido y respetá estrictamente la estructura pedida.",
    "REGLA CRÍTICA sobre fuentes: podés investigar y usar como base cualquier noticia real, incluida una donde el protagonista sea una empresa que compita directa o indirectamente con Blyndtek (agencias de desarrollo, consultoras de IA, software factories, proveedores de agentes de IA para empresas). PERO en el contenido público (títulos de slides, texto, caption, hooks, CTAs, hashtags e ideas de historias) NUNCA debés nombrar ni dar crédito visible a esa empresa competidora: ni su nombre, ni su producto, ni link a su anuncio. En su lugar, referenciá el fenómeno/tendencia de forma genérica: 'una tendencia que está creciendo en Argentina', 'cada vez más empresas del sector están lanzando propuestas así', 'el mercado se está moviendo hacia esto'. El campo noticia_fuente y noticia_url SÍ pueden contener el nombre real y el link real de la fuente original: esos campos son de uso interno/administrativo para que el equipo de Blyndtek pueda verificar el dato, NO se muestran en el contenido público. Fuentes que NO son competencia de Blyndtek (consultoras de investigación como McKinsey, medios de noticias, informes de mercado, papers, entidades gubernamentales) sí se pueden citar y nombrar libremente en el contenido público; esta restricción aplica ÚNICAMENTE a empresas que compiten con Blyndtek."
  ].join(" ");
}

function buildBrandContext(marca: MarcaContenido) {
  return [
    "Tagline maestro: Making complex work simple. Debe conservarse en inglés, en sentence case y con punto final. No inventes variantes ni traducciones para el lockup institucional.",
    `Tono de voz: ${marca.tono_voz || "directo, claro, premium y cercano"}`,
    `Público objetivo: ${marca.publico_objetivo || "dueños de PyME y empresas que necesitan sistemas reales"}`,
    `Tipografía de contenido: ${marca.tipografia || "DM Sans"}`,
    `Reglas visuales obligatorias: ${marca.reglas_visuales || "minimalismo B2B, aire visual, paleta suave, cero contenido genérico"}`,
    `Qué mostrar: ${marca.que_mostrar || "procesos, decisiones de negocio, automatización útil, sistemas que conectan datos"}`,
    `Qué evitar: ${marca.que_evitar || "contenido genérico, humo de IA, promesas irreales"}`
  ].join("\n");
}

function collectPublicText(plan: PlanGenerado) {
  return [
    plan.tema_general,
    plan.post_noticia.titulo,
    plan.post_noticia.caption,
    ...plan.post_noticia.hashtags,
    ...plan.post_noticia.slides.flatMap((slide) => [slide.titulo_slide, slide.texto]),
    plan.post_caso_uso.rubro,
    plan.post_caso_uso.titulo,
    plan.post_caso_uso.caption,
    ...plan.post_caso_uso.hashtags,
    ...plan.post_caso_uso.slides.flatMap((slide) => [slide.titulo_slide, slide.texto]),
    plan.post_dato_rapido.titulo,
    plan.post_dato_rapido.texto_principal,
    plan.post_dato_rapido.caption,
    ...plan.post_dato_rapido.hashtags,
    plan.guion_reel.hook,
    ...plan.guion_reel.puntos,
    plan.guion_reel.cta,
    plan.guion_reel.caption,
    ...plan.guion_reel.hashtags,
    ...plan.ideas_historias
  ].join("\n");
}

function assertNoKnownCompetitorMentions(plan: PlanGenerado) {
  const publicText = collectPublicText(plan).toLowerCase();
  const matchedTerm = COMPETITOR_TERMS.find((term) => publicText.includes(term.toLowerCase()));

  if (matchedTerm) {
    throw new Error(
      `Claude mencionó un competidor en contenido público (${matchedTerm}). No se guardó el plan; regeneralo para que use una referencia genérica.`
    );
  }
}

function buildPrompt(marca: MarcaContenido, semanaInicio: string, ultimoRubro: string | null) {
  return [
    "Buscá con web_search una noticia REAL y reciente de la última semana sobre IA aplicada a negocios, empresas o PyMEs.",
    "La noticia debe ser útil para dueños de PyME: nada demasiado académico, nada inventado, nada sin URL verificable.",
    "Con esa noticia y la identidad de Blyndtek, generá un plan semanal narrativamente conectado.",
    "El caso de uso debe referenciar la noticia; el dato rápido debe complementar ambos; el reel debe poder pararse solo y las historias amplificar el hilo.",
    ultimoRubro ? `El último rubro usado fue ${ultimoRubro}. Evitá repetirlo si podés.` : "Elegí un rubro específico para el caso de uso.",
    "Si la noticia elegida involucra una empresa competidora de Blyndtek, usá el nombre y link reales únicamente en noticia_fuente/noticia_url. En todos los campos públicos, hablá de la tendencia de forma genérica sin nombrarla.",
    `Semana inicio: ${semanaInicio}`,
    `Identidad de marca:\n${buildBrandContext(marca)}`,
    "Respondé SOLO con JSON válido, sin Markdown, sin comentarios y sin texto fuera del objeto.",
    `Formato exacto:
{
  "tema_general": "resumen corto del hilo narrativo de la semana",
  "noticia_fuente": "resumen de la noticia real encontrada",
  "noticia_url": "url real de la fuente",
  "post_noticia": {
    "titulo": "...",
    "slides": [{ "titulo_slide": "...", "texto": "..." }],
    "caption": "...",
    "hashtags": ["...", "..."]
  },
  "post_caso_uso": {
    "rubro": "gastronomía | inmobiliaria | indumentaria | salud | construcción | retail | servicios profesionales | otro rubro específico",
    "titulo": "...",
    "slides": [{ "titulo_slide": "...", "texto": "..." }],
    "caption": "...",
    "hashtags": ["...", "..."]
  },
  "post_dato_rapido": {
    "titulo": "...",
    "texto_principal": "dato o tip accionable corto",
    "caption": "...",
    "hashtags": ["...", "..."]
  },
  "guion_reel": {
    "hook": "primeros 3 segundos",
    "puntos": ["punto 1", "punto 2", "punto 3"],
    "cta": "cierre",
    "duracion_sugerida_seg": 30,
    "caption": "...",
    "hashtags": ["...", "..."]
  },
  "ideas_historias": ["idea 1", "idea 2", "idea 3", "idea 4", "idea 5"]
}`,
    "Usá máximo 5 hashtags por pieza. Los slides de carrusel deben ser 4 o 5."
  ].join("\n\n");
}

async function getUltimoRubro(supabase: SupabaseClient<ContenidoDatabase>, marcaId: string) {
  const { data } = await supabase
    .from("piezas_contenido")
    .select("guion")
    .eq("marca_id", marcaId)
    .eq("plataforma", "instagram_feed")
    .not("plan_semanal_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(6);

  for (const item of (data ?? []) as Array<{ guion: JsonValue | null }>) {
    const guion = item.guion;
    if (typeof guion === "object" && guion !== null && !Array.isArray(guion)) {
      const rubro = (guion as Record<string, JsonValue>).rubro;
      if (typeof rubro === "string" && rubro.trim()) {
        return rubro.trim();
      }
    }
  }

  return null;
}

async function generatePlanWithClaude(marca: MarcaContenido, semanaInicio: string, ultimoRubro: string | null) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("Falta ANTHROPIC_API_KEY.");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 5500,
      temperature: 0.45,
      system: buildSystemPrompt(),
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: [{ type: "text", text: buildPrompt(marca, semanaInicio, ultimoRubro) }] }]
    })
  });

  const payload = (await response.json()) as AnthropicResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Falló la generación con Claude.");
  }

  const text = getTextFromClaude(payload);
  if (!text) {
    throw new Error("Claude no devolvió contenido textual.");
  }

  const plan = parsePlanPayload(text);
  assertNoKnownCompetitorMentions(plan);
  return plan;
}

async function insertPlan(
  supabase: SupabaseClient<ContenidoDatabase>,
  marcaId: string,
  semanaInicio: string,
  plan: PlanGenerado,
  creadoPor: string | null
) {
  const { data: createdPlan, error: planError } = await supabase
    .from("planes_semanales")
    .insert({
      marca_id: marcaId,
      semana_inicio: semanaInicio,
      tema_general: plan.tema_general,
      noticia_fuente: plan.noticia_fuente,
      noticia_url: plan.noticia_url
    } as never)
    .select("*")
    .single();

  if (planError || !createdPlan) {
    throw new Error(planError?.message ?? "No se pudo guardar el plan semanal.");
  }

  const planId = (createdPlan as PlanSemanal).id;
  const piezasToInsert = [
    {
      marca_id: marcaId,
      plan_semanal_id: planId,
      tipo_pieza: "noticia",
      titulo: plan.post_noticia.titulo,
      caption: plan.post_noticia.caption,
      hashtags: plan.post_noticia.hashtags,
      plataforma: "instagram_feed",
      estado: "idea",
      guion: { tipo: "post_noticia", slides: plan.post_noticia.slides },
      creado_por: creadoPor
    },
    {
      marca_id: marcaId,
      plan_semanal_id: planId,
      tipo_pieza: "caso_uso",
      titulo: plan.post_caso_uso.titulo,
      caption: plan.post_caso_uso.caption,
      hashtags: plan.post_caso_uso.hashtags,
      plataforma: "instagram_feed",
      estado: "idea",
      guion: { tipo: "post_caso_uso", rubro: plan.post_caso_uso.rubro, slides: plan.post_caso_uso.slides },
      creado_por: creadoPor
    },
    {
      marca_id: marcaId,
      plan_semanal_id: planId,
      tipo_pieza: "dato_rapido",
      titulo: plan.post_dato_rapido.titulo,
      caption: plan.post_dato_rapido.caption,
      hashtags: plan.post_dato_rapido.hashtags,
      plataforma: "instagram_feed",
      estado: "idea",
      guion: { tipo: "post_dato_rapido", texto_principal: plan.post_dato_rapido.texto_principal },
      creado_por: creadoPor
    },
    {
      marca_id: marcaId,
      plan_semanal_id: planId,
      tipo_pieza: "reel",
      titulo: `Reel — ${plan.tema_general}`,
      caption: plan.guion_reel.caption,
      hashtags: plan.guion_reel.hashtags,
      plataforma: "instagram_reel",
      estado: "lista",
      guion: { tipo: "guion_reel", ...plan.guion_reel },
      creado_por: creadoPor
    },
    {
      marca_id: marcaId,
      plan_semanal_id: planId,
      tipo_pieza: "historia",
      titulo: `Historias — ${plan.tema_general}`,
      caption: null,
      hashtags: [],
      plataforma: "instagram_story",
      estado: "lista",
      guion: plan.ideas_historias,
      creado_por: creadoPor
    }
  ];

  const { data: piezas, error: piezasError } = await supabase
    .from("piezas_contenido")
    .insert(piezasToInsert as never)
    .select("*, pilar:pilares_contenido(*)")
    .order("created_at", { ascending: true });

  if (piezasError) {
    throw new Error(piezasError.message);
  }

  return {
    plan: createdPlan as PlanSemanal,
    piezas: (piezas ?? []) as PiezaContenido[]
  };
}

export async function generarPlanSemanalContenido({
  supabase,
  semanaInicio,
  creadoPor
}: {
  supabase: SupabaseClient<ContenidoDatabase>;
  semanaInicio: string;
  creadoPor: string | null;
}): Promise<PlanSemanalCreado> {
  const marca = await getBlyndtekContentBrand(supabase);
  if (!marca) {
    throw new Error("Marca Blyndtek not found");
  }

  const ultimoRubro = await getUltimoRubro(supabase, marca.id);
  const contenidoGenerado = await generatePlanWithClaude(marca, semanaInicio, ultimoRubro);
  const created = await insertPlan(supabase, marca.id, semanaInicio, contenidoGenerado, creadoPor);

  return {
    ...created,
    contenido_generado: contenidoGenerado
  };
}
