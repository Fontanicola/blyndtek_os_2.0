import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canUsuarioAccederNota } from "@/lib/notas/acceso";
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
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.from("notas").select("*").eq("id", params.id).single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    const nota = data as Nota;
    const canAccess = await canUsuarioAccederNota(supabase, nota, currentUser);

    if (!canAccess) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    return NextResponse.json({ data: nota });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const body = (await request.json()) as UpdateNotaInput;
    const supabase = createAdminClient();
    const { data: existingNote, error: fetchError } = await supabase
      .from("notas")
      .select("id, creado_por")
      .eq("id", params.id)
      .single();

    if (fetchError) {
      const status = fetchError.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: fetchError.message }, { status });
    }

    if (!existingNote) {
      return NextResponse.json({ error: "Nota no encontrada." }, { status: 404 });
    }

    const canAccess = await canUsuarioAccederNota(supabase, existingNote as Pick<Nota, "id" | "creado_por">, currentUser);

    if (!canAccess) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

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
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: existingNote, error: fetchError } = await supabase
      .from("notas")
      .select("id, creado_por")
      .eq("id", params.id)
      .single();

    if (fetchError) {
      const status = fetchError.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: fetchError.message }, { status });
    }

    if (!existingNote) {
      return NextResponse.json({ error: "Nota no encontrada." }, { status: 404 });
    }

    const canAccess = await canUsuarioAccederNota(supabase, existingNote as Pick<Nota, "id" | "creado_por">, currentUser);

    if (!canAccess) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

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
