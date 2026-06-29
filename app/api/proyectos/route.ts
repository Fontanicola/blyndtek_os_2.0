import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
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
      roadmap_publico_activo: body.roadmap_publico_activo ?? false
    };

    const { data, error } = await supabase.from("proyectos").insert(payload).select("*").single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data as Proyecto }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
