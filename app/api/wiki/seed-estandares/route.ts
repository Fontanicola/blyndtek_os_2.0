import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { tiptapBulletList, tiptapDoc, tiptapHeading, tiptapParagraph } from "@/lib/wiki-seed";
import type { Json } from "@/types/supabase";

type SeedResult = {
  categoria_creada: boolean;
  articulo_creado: boolean;
};

function buildArticleContent(): Json {
  return tiptapDoc([
    tiptapHeading("Por qué existe este documento"),
    tiptapParagraph([
      "Este documento define los estándares no negociables de cualquier proyecto construido por o para Blyndtek, tanto en frontend como en backend. Se referencia como contexto obligatorio en todo prompt a Codex/Claude Code, y como archivo ESTANDARES.md en la raíz de cada repo de cliente."
    ]),
    tiptapHeading('Estándares de frontend — "Nivel Apple, no negociable"'),
    tiptapHeading("Principios visuales", 3),
    tiptapBulletList([
      ['Máximo aire, mínimo ruido. Si una sección se ve "llena", está mal.'],
      [
        "Paleta acotada: 4-5 colores núcleo por proyecto (primario, fondo, texto, variantes semánticas de éxito/error/alerta). Nunca colores inventados sobre la marcha."
      ],
      ["Tipografía: máximo 3 pesos (400 cuerpo, 500 labels, 600 títulos). Cero bold pesado, cero itálica decorativa."],
      ["Radios consistentes en toda la app: componentes 6px, cards 8px y pills/badges 100px."],
      [
        "Las superficies se definen por borde fino (`border-line-soft`) antes que por sombra. La sombra queda casi imperceptible en cards normales y `shadow-modal` se reserva para elevación real: modales, dropdowns, toasts y overlays."
      ],
      ["Animaciones con propósito: 150-250ms, misma curva de easing en todo el proyecto."],
      [
        "Cero gradientes decorativos en navegación/formularios. Excepción: gráficos de datos sí pueden usar degradé, porque ahí comunica información."
      ]
    ]),
    tiptapHeading("Íconos y simbología — cero emojis genéricos", 3),
    tiptapBulletList([
      [
        "Prohibido el uso de emojis nativos o símbolos decorativos Unicode como recurso visual en cualquier parte de la interfaz: botones, toasts, headers, badges y notificaciones."
      ],
      ["Todo ícono de UI viene de `components/ui/icons.tsx` sobre `lucide-react`, con tamaño y grosor estandarizados."],
      [
        "Aplica también a contenido generado por IA (captions, notificaciones, textos de toast): mismo criterio de marca en todo lo que el sistema produce."
      ],
      [
        "Si hace falta un estado, una acción o un refuerzo visual, se usa el icono del sistema correspondiente; nunca un emoji genérico por default."
      ]
    ]),
    tiptapHeading("Estándares de datos/gráficos", 3),
    tiptapBulletList([
      ["Todo gráfico nuevo usa `lib/charts/chartTheme.ts` como fuente única de colores, grid, ejes, barras y tooltip."],
      ["La grilla de gráficos usa sólo líneas horizontales sutiles; no se reintroducen grids verticales salvo necesidad analítica explícita."],
      ["Todo gráfico de serie de tiempo lleva tooltip que sigue al mouse con el dato exacto."],
      ["Ejes con valores formateados en moneda/unidad real."],
      ['Prohibido mostrar $0 o 0% cuando en realidad es "sin datos"; son cosas distintas.'],
      ["KPIs con indicador visual de color/ícono, nunca solo texto plano."]
    ]),
    tiptapHeading("Estándares de layout", 3),
    tiptapBulletList([
      ["Nunca duplicar el nombre de la sección como título grande si ya está en la topbar."],
      ["Headers y toolbars fijos, contenido con su propio scroll interno."],
      ['Todo formulario de edición tiene un botón "Guardar" explícito.'],
      ["Estados vacíos con mensaje breve y útil usando siempre `components/ui/EmptyState.tsx`; no se reimplementan a mano."],
      ["Indicadores de guardado/autosave usando siempre `components/ui/SavingIndicator.tsx`; no se reimplementan badges sueltos de Guardando/Guardado."],
      ["Mobile-first en cualquier módulo visible a clientes finales."]
    ]),
    tiptapHeading("Cards vs filas con divisor", 3),
    tiptapBulletList([
      [
        "Usar Card para paneles de detalle, métricas, modales, resúmenes o contenido que necesite respiración propia. No usar Card para listas homogéneas de selección."
      ],
      [
        "Máximo un nivel de Card por región de pantalla. El contenido interno se separa con espaciado, jerarquía tipográfica o divisores finos; no con card dentro de card, salvo unidades KPI explícitas como MetricaCard."
      ],
      [
        "Usar filas con divisor fino para listas de selección de una sola entidad por ítem (clientes, proyectos, notas, artículos, carpetas o cualquier selector similar). La interacción debe leerse como lista, no como mosaico de tarjetas."
      ],
      [
        "Todo icono de UI viene de components/ui/icons.tsx, que reexporta lucide-react con tamaño y grosor estandarizados. No se dibuja un SVG de icono a mano de nuevo."
      ],
      [
        "`EmptyState.tsx` y `SavingIndicator.tsx` son componentes obligatorios para estados vacíos e indicadores de guardado. Ningún módulo nuevo debe resolver esos patrones con texto o badges aislados."
      ],
      [
        "El icono con badge de color solo se permite en MetricaCard y en los tiles de Archivos (ícono o miniatura). En cualquier otro lugar, el icono va solo, sin fondo circular decorativo."
      ],
      [
        "La regla de cero emojis genéricos aplica a toda la UI: cualquier símbolo decorativo debe resolverse con SVG propio y tipografía del sistema, no con Unicode pictográfico."
      ]
    ]),
    tiptapHeading("Checklist de QA visual", 3),
    tiptapBulletList([
      ["¿Se probó con datos reales, no solo con la maqueta vacía?"],
      ["¿El tooltip/hover realmente sigue al cursor, verificado visualmente?"],
      ["¿Hay texto o ícono repetido sin aportar información nueva?"],
      ["¿Los colores usados existen en la paleta definida del proyecto?"]
    ]),
    tiptapHeading('Estándares de backend — "Profesional, no vibecodeado"'),
    tiptapHeading("Autenticación y autorización", 3),
    tiptapBulletList([
      ["Toda ruta de API valida la sesión del lado del servidor."],
      ["Row Level Security activo en toda tabla nueva, desde el día que se crea."],
      ["Permisos por rol verificados en el backend, no solo ocultos en la UI."]
    ]),
    tiptapHeading("Manejo de secretos", 3),
    tiptapBulletList([
      ["Ninguna API key o credencial se commitea al repo: siempre variables de entorno."],
      ["La service role key nunca se expone al bundle del cliente."],
      ["Datos sensibles (tarjetas, credenciales de terceros) nunca en texto plano sin justificación documentada."]
    ]),
    tiptapHeading("Validación e integridad de datos", 3),
    tiptapBulletList([
      ["Todo input se valida en el servidor, nunca solo en el frontend."],
      ["TypeScript estricto, cero any, en todo el código."],
      ["Nunca concatenar SQL a mano con datos de usuario."],
      ["Soft-delete (papelera) para entidades con dependencias, nunca DELETE directo e irreversible."]
    ]),
    tiptapHeading("Manejo de errores", 3),
    tiptapBulletList([
      ["Ningún error de servidor se traga en silencio: se loguea con contexto suficiente."],
      ["Nunca exponer un stack trace o mensaje crudo de base de datos al usuario final."],
      ["Códigos de estado HTTP correctos, no todo 200 con error adentro."]
    ]),
    tiptapHeading("Higiene general", 3),
    tiptapBulletList([
      ["Sin código muerto comentado, sin console.log de debug olvidados."],
      ["Cada cambio de schema documentado en DATABASE.md, decisiones relevantes en DECISIONS.md."],
      ["Dependencias nuevas solo cuando son necesarias y justificadas."]
    ])
  ]);
}

async function getOrCreateCategory(supabase: ReturnType<typeof createAdminClient>, currentUserId: string | null) {
  const categoriaNombre = "Estándares técnicos";
  const { data: existingCategory, error: existingError } = await supabase
    .from("wiki_categorias")
    .select("id, nombre, orden")
    .eq("nombre", categoriaNombre)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingCategory) {
    return { categoriaId: existingCategory.id, created: false };
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

  return { categoriaId: data.id as string, created: true };
}

async function ensureArticle(
  supabase: ReturnType<typeof createAdminClient>,
  categoriaId: string,
  currentUserId: string | null
) {
  const titulo = "Constitución técnica de Blyndtek";
  const { data: existingArticle, error: searchError } = await supabase
    .from("wiki_articulos")
    .select("id")
    .eq("categoria_id", categoriaId)
    .eq("titulo", titulo)
    .maybeSingle();

  if (searchError) {
    throw new Error(searchError.message);
  }

  if (existingArticle) {
    return false;
  }

  const { error } = await supabase.from("wiki_articulos").insert({
    titulo,
    contenido: buildArticleContent(),
    categoria_id: categoriaId,
    orden: 1,
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
    const { categoriaId, created: categoriaCreada } = await getOrCreateCategory(supabase, admin.id);
    const articuloCreado = await ensureArticle(supabase, categoriaId, admin.id);

    const result: SeedResult = {
      categoria_creada: categoriaCreada,
      articulo_creado: articuloCreado
    };

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
