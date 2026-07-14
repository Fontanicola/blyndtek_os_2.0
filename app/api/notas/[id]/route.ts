import { NextRequest, NextResponse } from "next/server";
import { sanitizeNotaTags } from "@/lib/notas";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Nota, UpdateNotaInput } from "@/types/notas";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("notas").select("*").eq("id", params.id).single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ data: data as Nota });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const body = (await request.json()) as UpdateNotaInput;
    const supabase = createAdminClient();
    const payload: UpdateNotaInput = {};

    if (typeof body.titulo === "string") {
      payload.titulo = body.titulo.trim();
    }

    if ("contenido" in body) {
      payload.contenido = body.contenido ?? null;
    }

    if ("carpeta_id" in body) {
      payload.carpeta_id = body.carpeta_id ?? null;
    }

    if (typeof body.fijada === "boolean") {
      payload.fijada = body.fijada;
    }

    if ("cliente_id" in body) {
      payload.cliente_id = body.cliente_id ?? null;
    }

    if ("proyecto_id" in body) {
      payload.proyecto_id = body.proyecto_id ?? null;
    }

    if ("lead_id" in body) {
      payload.lead_id = body.lead_id ?? null;
    }

    if ("tags" in body) {
      payload.tags = sanitizeNotaTags(body.tags);
    }

    const { data, error } = await supabase
      .from("notas")
      .update(payload)
      .eq("id", params.id)
      .select("*")
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ data: data as Nota });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("notas")
      .update({
        en_papelera: true,
        eliminada_at: new Date().toISOString()
      })
      .eq("id", params.id)
      .select("*")
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ data: data as Nota });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
