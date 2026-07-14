import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UpdateWikiCategoriaInput, WikiCategoria } from "@/types/wiki";

type RouteContext = {
  params: {
    id: string;
  };
};

async function getCategoriaCount(
  supabase: ReturnType<typeof createAdminClient>,
  categoriaId: string
) {
  const { count, error } = await supabase
    .from("wiki_articulos")
    .select("id", { count: "exact", head: true })
    .eq("categoria_id", categoriaId);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const body = (await request.json()) as UpdateWikiCategoriaInput;
    const supabase = createAdminClient();

    const payload: UpdateWikiCategoriaInput = {};
    if (typeof body.nombre === "string") {
      payload.nombre = body.nombre.trim();
    }
    if (typeof body.orden === "number") {
      payload.orden = body.orden;
    }

    const { data, error } = await supabase
      .from("wiki_categorias")
      .update(payload)
      .eq("id", params.id)
      .select("*")
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ data: data as WikiCategoria });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const supabase = createAdminClient();
    const count = await getCategoriaCount(supabase, params.id);

    if (count > 0) {
      return NextResponse.json({ error: "La categoría no está vacía." }, { status: 400 });
    }

    const { error } = await supabase.from("wiki_categorias").delete().eq("id", params.id);

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
