import { NextRequest, NextResponse } from "next/server";
import { isValidGitHubRepo, normalizeGitHubRepo } from "@/lib/ai-dev";
import { getCurrentUser } from "@/lib/auth";
import { ensureCarpetaAutomaticaProyecto } from "@/lib/carpetas";
import { createAdminClient } from "@/lib/supabase/admin";
import { generarSlugRoadmap } from "@/lib/proyectos/generarSlug";
import type { CreateProyectoInput, Proyecto } from "@/types/proyectos";

function parseEstado(searchParams: URLSearchParams) {
  const estado = searchParams.get("estado");
  if (
    estado === "por_empezar" ||
    estado === "en_desarrollo" ||
    estado === "implementacion" ||
    estado === "entregado" ||
    estado === "soporte" ||
    estado === "pausado"
  ) {
    return estado;
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const estado = parseEstado(request.nextUrl.searchParams);
    const clienteId = request.nextUrl.searchParams.get("cliente_id")?.trim() || null;

    let query = supabase.from("proyectos").select("*").order("created_at", { ascending: false });

    if (estado) {
      query = query.eq("estado", estado);
    }

    if (clienteId) {
      query = query.eq("cliente_id", clienteId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: (data ?? []) as Proyecto[] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    const body = (await request.json()) as CreateProyectoInput;
    const supabase = createAdminClient();

    if (!body.cliente_id?.trim()) {
      return NextResponse.json({ error: "cliente_id is required" }, { status: 400 });
    }

    if (!body.nombre?.trim()) {
      return NextResponse.json({ error: "nombre is required" }, { status: 400 });
    }

    if (body.github_repo && !isValidGitHubRepo(body.github_repo)) {
      return NextResponse.json({ error: "github_repo must be in owner/repo format." }, { status: 400 });
    }

    const { data: clienteData, error: clienteError } = await supabase
      .from("clientes")
      .select("empresa")
      .eq("id", body.cliente_id)
      .single();

    if (clienteError || !clienteData) {
      const status = clienteError?.code === "PGRST116" ? 404 : 500;
      return NextResponse.json(
        { error: clienteError?.message ?? "No se pudo resolver el cliente." },
        { status }
      );
    }

    if (!body.cotizacion_id?.trim()) {
      const { data: latestCotizacion } = await supabase
        .from("cotizaciones")
        .select("id")
        .eq("cliente_id", body.cliente_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!latestCotizacion?.id) {
        return NextResponse.json(
          {
            error:
              "cotizacion_id is required when the selected client does not have a previous cotización."
          },
          { status: 400 }
        );
      }

      body.cotizacion_id = latestCotizacion.id;
    }

    async function generateUniqueRoadmapSlug(nombreCliente: string) {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const candidate = generarSlugRoadmap(nombreCliente);
        const { data: existingSlug, error: slugError } = await supabase
          .from("proyectos")
          .select("id")
          .eq("roadmap_slug", candidate)
          .maybeSingle();

        if (slugError) {
          throw new Error(slugError.message);
        }

        if (!existingSlug) {
          return candidate;
        }
      }

      throw new Error("No se pudo generar un slug único para el roadmap.");
    }

    const roadmapSlug = await generateUniqueRoadmapSlug(clienteData.empresa);

    const payload = {
      cotizacion_id: body.cotizacion_id,
      cliente_id: body.cliente_id,
      nombre: body.nombre.trim(),
      estado: body.estado ?? "por_empezar",
      responsable_id: body.responsable_id ?? currentUser?.id ?? null,
      devs_asignados: body.devs_asignados ?? [],
      fecha_inicio: body.fecha_inicio ?? null,
      entrega_comprometida: body.entrega_comprometida ?? null,
      entrega_real: body.entrega_real ?? null,
      avance_pct: 0,
      valor_total: body.valor_total ?? null,
      notas_arquitectura: body.notas_arquitectura ?? null,
      roadmap_token: crypto.randomUUID(),
      roadmap_slug: roadmapSlug,
      roadmap_publico_activo: body.roadmap_publico_activo ?? false,
      github_repo: body.github_repo ? normalizeGitHubRepo(body.github_repo) : null
    };

    const { data, error } = await supabase.from("proyectos").insert(payload).select("*").single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const proyecto = data as Proyecto;

    try {
      await ensureCarpetaAutomaticaProyecto(supabase, {
        id: proyecto.id,
        nombre: proyecto.nombre
      });
    } catch (folderError) {
      const message = folderError instanceof Error ? folderError.message : "Unexpected folder error";
      console.error("No se pudo crear la carpeta automática del proyecto:", message);
    }

    return NextResponse.json({ data: proyecto }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
