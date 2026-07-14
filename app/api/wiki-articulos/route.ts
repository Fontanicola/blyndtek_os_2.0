import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createEmptyTipTapContent } from "@/lib/notas";
import { matchesWikiSearch, sortWikiArticulos } from "@/lib/wiki";
import type { CreateWikiArticuloInput, WikiArticulo } from "@/types/wiki";

function optionalTrim(value: string | null) {
  return value?.trim() || null;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const searchParams = request.nextUrl.searchParams;
    const categoriaId = optionalTrim(searchParams.get("categoria_id"));
    const buscar = optionalTrim(searchParams.get("buscar"));

    let query = supabase.from("wiki_articulos").select("*");

    if (categoriaId) {
      query = query.eq("categoria_id", categoriaId);
    } else {
      query = query.is("categoria_id", null);
    }

    const { data, error } = await query.order("orden", { ascending: true }).order("updated_at", {
      ascending: false
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const filtered = buscar
      ? (data ?? []).filter((articulo) => matchesWikiSearch(articulo as WikiArticulo, buscar))
      : data ?? [];

    return NextResponse.json({ data: sortWikiArticulos(filtered as WikiArticulo[]) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    const body = (await request.json()) as CreateWikiArticuloInput;
    const supabase = createAdminClient();

    const categoriaId = body.categoria_id ?? null;

    let maxQuery = supabase.from("wiki_articulos").select("orden");
    if (categoriaId) {
      maxQuery = maxQuery.eq("categoria_id", categoriaId);
    } else {
      maxQuery = maxQuery.is("categoria_id", null);
    }

    const { data: maxRow, error: maxError } = await maxQuery
      .order("orden", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxError) {
      return NextResponse.json({ error: maxError.message }, { status: 500 });
    }

    const payload = {
      titulo: body.titulo?.trim() || "Nuevo artículo",
      contenido: body.contenido ?? createEmptyTipTapContent(),
      categoria_id: categoriaId,
      orden: body.orden ?? ((maxRow?.orden ?? 0) + 1),
      creado_por: currentUser?.id ?? null
    };

    const { data, error } = await supabase.from("wiki_articulos").insert(payload).select("*").single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
