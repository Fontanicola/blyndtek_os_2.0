import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminUser } from "@/lib/require-admin";
import { getBlyndtekContentBrand } from "@/lib/contenido/blyndtek";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentesDatabase } from "@/types/agentes";
import type { ContenidoDatabase, PiezaContenido } from "@/types/contenido";

export const runtime = "nodejs";
export const maxDuration = 90;

type RouteContext = {
  params: {
    id: string;
  };
};

type ApiPayload<T> = {
  data?: T;
  error?: string;
};

type GenerarFondoData = {
  prompt_fondo: string | null;
  fondo_storage_path: string | null;
  tokens_entrada: number | null;
  tokens_salida: number | null;
  costo_generacion_usd: number | null;
  pieza?: {
    titulo?: string | null;
  };
};

type RenderizarData = {
  imagenes_generadas: string[];
  pieza: unknown;
};

function isServiceRoleAuthorized(request: Request) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(serviceRoleKey && request.headers.get("authorization") === `Bearer ${serviceRoleKey}`);
}

async function postInternal<T>(request: Request, path: string) {
  const response = await fetch(new URL(path, request.url), {
    method: "POST",
    headers: {
      cookie: request.headers.get("cookie") ?? "",
      authorization: request.headers.get("authorization") ?? ""
    }
  });

  const payload = (await response.json().catch(() => ({}))) as ApiPayload<T>;
  if (!response.ok || !payload.data) {
    throw new Error(payload.error ?? "No se pudo completar la generación.");
  }

  return payload.data;
}

async function getPiezaForGeneration(id: string) {
  const supabase = createAdminClient() as unknown as SupabaseClient<ContenidoDatabase>;
  const marca = await getBlyndtekContentBrand(supabase);

  if (!marca) {
    throw new Error("Marca Blyndtek not found");
  }

  const { data, error } = await supabase
    .from("piezas_contenido")
    .select("*, pilar:pilares_contenido(*), plan:planes_semanales(*)")
    .eq("id", id)
    .eq("marca_id", marca.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Pieza not found");
  }

  return data as PiezaContenido;
}

async function registrarActividadGenerador({
  supabase,
  generadoPor,
  piezaId,
  titulo,
  fondo,
  render
}: {
  supabase: SupabaseClient<AgentesDatabase>;
  generadoPor: string | null;
  piezaId: string;
  titulo: string;
  fondo: GenerarFondoData | null;
  render: RenderizarData;
}) {
  const { data: agente, error: agenteError } = await supabase
    .from("agentes")
    .select("id")
    .eq("slug", "generador-contenido")
    .maybeSingle();

  if (agenteError || !agente) {
    return null;
  }

  const { data: actividad, error: insertError } = await supabase
    .from("agente_analisis")
    .insert({
      agente_id: agente.id,
      tipo: "bajo_demanda",
      datos_calculados: {
        pieza_id: piezaId,
        fondo_storage_path: fondo?.fondo_storage_path ?? null,
        imagenes_generadas: render.imagenes_generadas
      },
      analisis_texto: `Generación visual completada para "${titulo}" (${render.imagenes_generadas.length} slide${render.imagenes_generadas.length === 1 ? "" : "s"}).`,
      tokens_entrada: fondo?.tokens_entrada ?? null,
      tokens_salida: fondo?.tokens_salida ?? null,
      costo_estimado_usd: fondo?.costo_generacion_usd ?? null,
      generado_por: generadoPor
    })
    .select("id")
    .single();

  if (insertError || !actividad) {
    return null;
  }

  return actividad.id;
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const admin = await getAdminUser();
    const serviceRoleAuthorized = isServiceRoleAuthorized(request);
    if (!admin && !serviceRoleAuthorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const pieza = await getPiezaForGeneration(params.id);
    const shouldGenerateBackground = pieza.tipo_pieza === "noticia" || pieza.tipo_pieza === "caso_uso";
    const fondo = shouldGenerateBackground
      ? await postInternal<GenerarFondoData>(request, `/api/piezas-contenido/${params.id}/generar-imagen`)
      : null;
    const render = await postInternal<RenderizarData>(request, `/api/piezas-contenido/${params.id}/renderizar`);

    const supabase = createAdminClient() as SupabaseClient<AgentesDatabase>;
    const actividadId = await registrarActividadGenerador({
      supabase,
      generadoPor: admin?.id ?? null,
      piezaId: params.id,
      titulo: fondo?.pieza?.titulo ?? pieza.titulo ?? "Pieza sin título",
      fondo,
      render
    });

    return NextResponse.json({
      data: {
        imagenes_generadas: render.imagenes_generadas,
        prompt_fondo: fondo?.prompt_fondo ?? null,
        fondo_storage_path: fondo?.fondo_storage_path ?? null,
        actividad_id: actividadId,
        pieza: render.pieza
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
