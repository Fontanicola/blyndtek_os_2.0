import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UpdateWikiArticuloInput, WikiArticulo } from "@/types/wiki";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("wiki_articulos").select("*").eq("id", params.id).single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ data: data as WikiArticulo });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const body = (await request.json()) as UpdateWikiArticuloInput;
    const supabase = createAdminClient();
    const payload: UpdateWikiArticuloInput & { updated_at: string } = {
      updated_at: new Date().toISOString()
    };

    if (typeof body.titulo === "string") {
      payload.titulo = body.titulo.trim();
    }

    if ("contenido" in body) {
      payload.contenido = body.contenido ?? null;
    }

    if ("categoria_id" in body) {
      payload.categoria_id = body.categoria_id ?? null;
    }

    if (typeof body.orden === "number") {
      payload.orden = body.orden;
    }

    const { data, error } = await supabase
      .from("wiki_articulos")
      .update(payload)
      .eq("id", params.id)
      .select("*")
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ data: data as WikiArticulo });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("wiki_articulos").delete().eq("id", params.id);

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
