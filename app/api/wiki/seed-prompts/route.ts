import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { tiptapBulletList, tiptapCodeBlock, tiptapDoc, tiptapHeading, tiptapParagraph } from "@/lib/wiki-seed";

type SeedResult = {
  categoria_creada: boolean;
  articulos_creados: number;
  articulos_omitidos: number;
};

function buildArticles() {
  return [
    {
      titulo: "Cómo trabajamos con Claude + Codex",
      contenido: tiptapDoc([
        tiptapHeading("El flujo de trabajo"),
        tiptapParagraph([
          "Blyndtek OS se construye con un flujo de dos roles claramente separados:"
        ]),
        tiptapBulletList([
          [
            { text: "Claude", bold: true },
            " actúa como arquitecto técnico y PM. Piensa la arquitectura, escribe el SQL de cada cambio de base de datos y genera los prompts exactos para Codex."
          ],
          [
            { text: "Codex", bold: true },
            " ejecuta. Recibe un prompt por vez, escribe el código real y confirma qué archivos creó o modificó."
          ],
          [
            { text: "Felipe/Gonzalo", bold: true },
            " ejecutan manualmente cada SQL en el editor de Supabase antes de pasarle el prompt correspondiente a Codex. Codex nunca tiene acceso directo a la base de datos."
          ]
        ]),
        tiptapHeading("Reglas de oro"),
        tiptapBulletList([
          ["Un prompt = una unidad de trabajo. Nunca dos features distintas en el mismo prompt."],
          [
            "Todo prompt que cree o modifique tablas va precedido por su SQL, que se ejecuta a mano en Supabase antes de pasarle nada a Codex."
          ],
          [
            "Todo prompt termina con la instrucción de actualizar docs/PROGRESS.md con lo que se hizo, y docs/DECISIONS.md si hubo una decisión de arquitectura relevante."
          ],
          [
            "Nunca se usan librerías de UI genéricas (MUI, Chakra, Shadcn, Ant Design). Solo Tailwind + componentes propios del design system."
          ],
          ["TypeScript estricto, sin any, en todo el código."],
          [
            "Cuando un bug persiste después de 2-3 intentos de fix, se cambia de método: en vez de pedir 'arreglalo', se pide un diagnóstico explícito con evidencia (logs, bisección de componentes) antes de tocar código de nuevo."
          ],
          [
            "Después de cualquier cambio grande, limpiar el cache de build (rm -rf .next) antes de asumir que algo no funciona."
          ]
        ])
      ])
    },
    {
      titulo: "Prompt inicial de arquitecto técnico (plantilla)",
      contenido: tiptapDoc([
        tiptapHeading("Cuándo usar esto"),
        tiptapParagraph([
          "Este es el prompt con el que se le da a Claude el rol de arquitecto técnico y PM al arrancar un proyecto nuevo con Codex. Adaptá los corchetes [ ] a cada proyecto nuevo."
        ]),
        tiptapHeading("El prompt"),
        tiptapCodeBlock([
          "Eres el arquitecto técnico y PM de [NOMBRE_DEL_PROYECTO].",
          "Trabajás sobre [STACK_DEL_PROYECTO] y guiás el desarrollo paso a paso.",
          "",
          "Reglas de trabajo:",
          "- Leé docs/SPEC.md y docs/DATABASE.md como contexto al empezar, pero no los repitas en cada respuesta.",
          "- Un prompt = una unidad de trabajo. No mezcles features distintas en el mismo prompt.",
          "- Cada prompt debe ser autocontenido, preciso y terminar con la instrucción de actualizar docs/PROGRESS.md.",
          "- Si el cambio toca base de datos, incluí primero el SQL exacto para ejecutar manualmente en Supabase antes de pasarle el prompt a Codex.",
          "- Especificá exactamente qué archivos crear o modificar.",
          "- Si hubo una decisión de arquitectura relevante, indicá también actualizar docs/DECISIONS.md.",
          "- Nunca uses librerías de UI genéricas. Solo Tailwind y componentes propios del design system.",
          "- Mantén TypeScript estricto y componentes atómicos/reutilizables.",
          "- La estética debe ser nivel Apple: paleta cuidada, tipografía Inter, radios suaves, sombras de una capa y animaciones sutiles.",
          "",
          "Comportamiento esperado:",
          "- Claude actúa como arquitecto técnico y PM.",
          "- Codex ejecuta un solo prompt por turno.",
          "- El usuario dice 'siguiente' para pedir el próximo prompt."
        ]),
        tiptapParagraph([
          "Usá esta plantilla como base para cualquier proyecto nuevo, reemplazando los placeholders por el stack y el nombre reales."
        ])
      ])
    },
    {
      titulo: "Prompt: migrar datos desde Excel/CSV a SQL",
      contenido: tiptapDoc([
        tiptapHeading("Cuándo usar esto"),
        tiptapParagraph([
          "Cuando hay que migrar datos reales desde un Excel o CSV existente (clientes, leads, cobros, etc.) a las tablas de Supabase."
        ]),
        tiptapHeading("Cómo pedirlo"),
        tiptapBulletList([
          ["Subí el archivo Excel/CSV al chat."],
          [
            "Pedile a Claude: 'Leé este Excel y armame el SQL de INSERT para migrarlo a la tabla [nombre_tabla], respetando el esquema de docs/DATABASE.md.'"
          ],
          [
            "Claude va a leer el archivo con las herramientas de análisis, mapear cada columna del Excel a su campo correspondiente en la tabla, preguntar por ambigüedades antes de asumir nada, y devolver el SQL completo listo para pegar en el SQL Editor de Supabase."
          ]
        ]),
        tiptapHeading("Cosas a verificar antes de ejecutar"),
        tiptapBulletList([
          [
            "Orden de inserción: si hay relaciones (foreign keys) entre tablas, el SQL debe insertar primero la tabla padre (ej: clientes antes que proyectos)."
          ],
          [
            "Si el INSERT tiene múltiples filas en un solo statement y una fila falla, Postgres revierte todo el bloque; conviene ejecutar por partes si el bloque es muy largo."
          ],
          [
            "Revisar fechas con año ambiguo (ej: 23/06 sin especificar) antes de asumir el año actual."
          ]
        ])
      ])
    },
    {
      titulo: "Prompt: diagnosticar un bug persistente",
      contenido: tiptapDoc([
        tiptapHeading("Cuándo usar esto"),
        tiptapParagraph([
          "Cuando un mismo bug se 'arregla' 2 o 3 veces sin resultado real: señal de que Codex está tocando síntomas en vez de la causa."
        ]),
        tiptapHeading("El prompt"),
        tiptapCodeBlock([
          "No asumas la causa del bug.",
          "Hacé una bisección real: comentá componentes de a uno hasta aislar exactamente cuál rompe.",
          "Agregá logs temporales para ver qué datos recibe cada capa (backend vs frontend).",
          "Si sospechás de un cast forzado de TypeScript o de una librería, verificá la versión instalada y la compatibilidad antes de tocar más código.",
          "No des el fix por terminado hasta identificar la causa exacta con evidencia.",
          "En la respuesta final, decí explícitamente cuál fue la causa raíz, qué archivo/línea la provocaba y cómo la verificaste visualmente."
        ]),
        tiptapHeading("Señales de que hace falta este enfoque"),
        tiptapBulletList([
          ["La respuesta de Codex describe el fix pero el problema visual no cambia en absoluto."],
          ["El mismo tipo de error reaparece en un componente relacionado."],
          ["Codex dice 'corregido' pero no explica la causa raíz concreta."]
        ])
      ])
    },
    {
      titulo: "Checklist antes de pasar un prompt a Codex",
      contenido: tiptapDoc([
        tiptapHeading("Checklist antes de pasar un prompt a Codex"),
        tiptapBulletList([
          ["¿El prompt toca una sola unidad de trabajo, o se mezclaron varias features?"],
          ["Si crea/modifica tablas, ¿ya ejecuté el SQL en Supabase?"],
          ["¿Especifiqué exactamente qué archivos crear o modificar?"],
          ["¿Incluí la instrucción de actualizar docs/PROGRESS.md al final?"],
          ["Si es un cambio visual, ¿referencié los tokens del design system en vez de dejar que Codex invente colores?"],
          ["Si es un fix de un bug que ya falló antes, ¿le pedí diagnóstico explícito en vez de 'arreglalo'?"]
        ])
      ])
    }
  ];
}

async function upsertCategory(
  supabase: ReturnType<typeof createAdminClient>,
  currentUserId: string | null
) {
  const categoriaNombre = "Librería de Prompts";
  const { data: existingCategory, error: categoryError } = await supabase
    .from("wiki_categorias")
    .select("id, nombre, orden")
    .eq("nombre", categoriaNombre)
    .maybeSingle();

  if (categoryError) {
    throw new Error(categoryError.message);
  }

  if (existingCategory) {
    return { categoriaId: existingCategory.id, categoriaCreada: false };
  }

  const { data: maxRow, error: maxError } = await supabase
    .from("wiki_categorias")
    .select("orden")
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (maxError) {
    throw new Error(maxError.message);
  }

  const { data, error } = await supabase
    .from("wiki_categorias")
    .insert({
      nombre: categoriaNombre,
      orden: (maxRow?.orden ?? 0) + 1,
      creado_por: currentUserId
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return { categoriaId: data.id as string, categoriaCreada: true };
}

async function ensureArticle(
  supabase: ReturnType<typeof createAdminClient>,
  categoriaId: string,
  articulo: ReturnType<typeof buildArticles>[number],
  orden: number,
  currentUserId: string | null
) {
  const { data: existingArticle, error: searchError } = await supabase
    .from("wiki_articulos")
    .select("id")
    .eq("categoria_id", categoriaId)
    .eq("titulo", articulo.titulo)
    .maybeSingle();

  if (searchError) {
    throw new Error(searchError.message);
  }

  if (existingArticle) {
    return false;
  }

  const { error } = await supabase.from("wiki_articulos").insert({
    titulo: articulo.titulo,
    contenido: articulo.contenido,
    categoria_id: categoriaId,
    orden,
    creado_por: currentUserId
  });

  if (error) {
    throw new Error(error.message);
  }

  return true;
}

export async function POST() {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { categoriaId, categoriaCreada } = await upsertCategory(supabase, admin.id);
    const articles = buildArticles();

    let articulosCreados = 0;
    let articulosOmitidos = 0;

    for (const [index, articulo] of articles.entries()) {
      const created = await ensureArticle(supabase, categoriaId, articulo, index + 1, admin.id);
      if (created) {
        articulosCreados += 1;
      } else {
        articulosOmitidos += 1;
      }
    }

    const result: SeedResult = {
      categoria_creada: categoriaCreada,
      articulos_creados: articulosCreados,
      articulos_omitidos: articulosOmitidos
    };

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
