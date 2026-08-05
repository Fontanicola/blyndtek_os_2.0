import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrandManagerUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBlyndtekContentBrand } from "@/lib/contenido/blyndtek";
import type { ContenidoDatabase, PiezaContenido, PiezaContenidoEstado } from "@/types/contenido";

type RouteContext = {
  params: {
    id: string;
  };
};

const EDITABLE_ESTADOS = new Set<PiezaContenidoEstado>(["idea", "en_diseno", "lista", "programada", "publicada"]);

async function assertBlyndtekPieza(supabase: SupabaseClient<ContenidoDatabase>, id: string) {
  const marca = await getBlyndtekContentBrand(supabase);

  if (!marca) {
    return { marca: null, pieza: null };
  }

  const { data } = await supabase
    .from("piezas_contenido")
    .select("*, pilar:pilares_contenido(*), plan:planes_semanales(*)")
    .eq("id", id)
    .eq("marca_id", marca.id)
    .maybeSingle();

  return { marca, pieza: (data as PiezaContenido | null) ?? null };
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const admin = await getBrandManagerUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient() as unknown as SupabaseClient<ContenidoDatabase>;
    const { pieza } = await assertBlyndtekPieza(supabase, params.id);

    if (!pieza) {
      return NextResponse.json({ error: "Pieza not found" }, { status: 404 });
    }

    return NextResponse.json({ data: pieza });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const admin = await getBrandManagerUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient() as unknown as SupabaseClient<ContenidoDatabase>;
    const { pieza } = await assertBlyndtekPieza(supabase, params.id);

    if (!pieza) {
      return NextResponse.json({ error: "Pieza not found" }, { status: 404 });
    }

    const body = (await request.json()) as Partial<PiezaContenido>;
    const updatePayload: Partial<PiezaContenido> = {};

    if ("titulo" in body) updatePayload.titulo = body.titulo?.trim() || "Sin título";
    if ("pilar_id" in body) updatePayload.pilar_id = body.pilar_id || null;
    if ("caption" in body) updatePayload.caption = body.caption?.toString() || null;
    if ("hashtags" in body) {
      updatePayload.hashtags = Array.isArray(body.hashtags)
        ? Array.from(new Set(body.hashtags.map((tag) => tag.trim()).filter(Boolean)))
        : [];
    }
    if ("estado" in body && body.estado && EDITABLE_ESTADOS.has(body.estado)) {
      updatePayload.estado = body.estado;
      if (body.estado === "publicada") {
        updatePayload.publicado_at = new Date().toISOString();
      }
    }
    if ("fecha_programada" in body) updatePayload.fecha_programada = body.fecha_programada || null;
    updatePayload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("piezas_contenido")
      .update(updatePayload as never)
      .eq("id", params.id)
      .select("*, pilar:pilares_contenido(*), plan:planes_semanales(*)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const admin = await getBrandManagerUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient() as unknown as SupabaseClient<ContenidoDatabase>;
    const { pieza } = await assertBlyndtekPieza(supabase, params.id);

    if (!pieza) {
      return NextResponse.json({ error: "Pieza not found" }, { status: 404 });
    }

    const { error } = await supabase.from("piezas_contenido").delete().eq("id", params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (pieza.storage_path) {
      await supabase.storage.from("archivos-blyndtek").remove([pieza.storage_path]);
    }

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
