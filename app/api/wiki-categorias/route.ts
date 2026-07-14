import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CreateWikiCategoriaInput, WikiCategoria } from "@/types/wiki";

type CategoriaConConteo = WikiCategoria & { cantidad_articulos: number };

async function buildCategoryCounts(supabase: ReturnType<typeof createAdminClient>) {
  return supabase.from("wiki_articulos").select("categoria_id");
}

export async function GET() {
  try {
    const supabase = createAdminClient();
    const [{ data: categoriasData, error: categoriasError }, { data: articulosData, error: articulosError }] =
      await Promise.all([
        supabase.from("wiki_categorias").select("*").order("orden", { ascending: true }),
        buildCategoryCounts(supabase)
      ]);

    if (categoriasError) {
      return NextResponse.json({ error: categoriasError.message }, { status: 500 });
    }

    if (articulosError) {
      return NextResponse.json({ error: articulosError.message }, { status: 500 });
    }

    const counts = new Map<string, number>();
    for (const articulo of articulosData ?? []) {
      if (articulo.categoria_id) {
        counts.set(articulo.categoria_id, (counts.get(articulo.categoria_id) ?? 0) + 1);
      }
    }

    const data: CategoriaConConteo[] = (categoriasData ?? []).map((categoria) => ({
      ...(categoria as WikiCategoria),
      cantidad_articulos: counts.get(categoria.id) ?? 0
    }));

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    const body = (await request.json()) as CreateWikiCategoriaInput;

    if (!body.nombre?.trim()) {
      return NextResponse.json({ error: "nombre is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: maxRow, error: maxError } = await supabase
      .from("wiki_categorias")
      .select("orden")
      .order("orden", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxError) {
      return NextResponse.json({ error: maxError.message }, { status: 500 });
    }

    const payload = {
      nombre: body.nombre.trim(),
      orden: body.orden ?? ((maxRow?.orden ?? 0) + 1),
      creado_por: currentUser?.id ?? null
    };

    const { data, error } = await supabase.from("wiki_categorias").insert(payload).select("*").single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
