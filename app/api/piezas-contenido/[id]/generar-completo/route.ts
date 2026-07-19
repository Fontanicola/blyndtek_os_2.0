import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentesDatabase } from "@/types/agentes";

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
  fondo: GenerarFondoData;
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
        fondo_storage_path: fondo.fondo_storage_path,
        imagenes_generadas: render.imagenes_generadas
      },
      analisis_texto: `Generación visual completada para "${titulo}" (${render.imagenes_generadas.length} slide${render.imagenes_generadas.length === 1 ? "" : "s"}).`,
      tokens_entrada: fondo.tokens_entrada,
      tokens_salida: fondo.tokens_salida,
      costo_estimado_usd: fondo.costo_generacion_usd,
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

    const fondo = await postInternal<GenerarFondoData>(request, `/api/piezas-contenido/${params.id}/generar-imagen`);
    const render = await postInternal<RenderizarData>(request, `/api/piezas-contenido/${params.id}/renderizar`);

    const supabase = createAdminClient() as SupabaseClient<AgentesDatabase>;
    const actividadId = await registrarActividadGenerador({
      supabase,
      generadoPor: admin?.id ?? null,
      piezaId: params.id,
      titulo: fondo.pieza?.titulo ?? "Pieza sin título",
      fondo,
      render
    });

    return NextResponse.json({
      data: {
        imagenes_generadas: render.imagenes_generadas,
        prompt_fondo: fondo.prompt_fondo,
        fondo_storage_path: fondo.fondo_storage_path,
        actividad_id: actividadId,
        pieza: render.pieza
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
