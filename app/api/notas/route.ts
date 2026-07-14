import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createEmptyTipTapContent, matchesNotaSearch, sanitizeNotaTags, sortNotas } from "@/lib/notas";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CreateNotaInput, Nota } from "@/types/notas";

function parseBoolean(value: string | null) {
  if (value === null) {
    return null;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return null;
}

function optionalTrim(value: string | null) {
  return value?.trim() || null;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const searchParams = request.nextUrl.searchParams;
    const carpetaId = optionalTrim(searchParams.get("carpeta_id"));
    const fijadas = parseBoolean(searchParams.get("fijadas"));
    const papelera = parseBoolean(searchParams.get("papelera"));
    const buscar = optionalTrim(searchParams.get("buscar"));
    const clienteId = optionalTrim(searchParams.get("cliente_id"));
    const proyectoId = optionalTrim(searchParams.get("proyecto_id"));
    const leadId = optionalTrim(searchParams.get("lead_id"));
    const tag = optionalTrim(searchParams.get("tag"));

    let query = supabase.from("notas").select("*");

    if (carpetaId) {
      query = query.eq("carpeta_id", carpetaId);
    }

    if (fijadas !== null) {
      query = query.eq("fijada", fijadas);
    }

    if (papelera !== null) {
      query = query.eq("en_papelera", papelera);
    } else {
      query = query.eq("en_papelera", false);
    }

    if (clienteId) {
      query = query.eq("cliente_id", clienteId);
    }

    if (proyectoId) {
      query = query.eq("proyecto_id", proyectoId);
    }

    if (leadId) {
      query = query.eq("lead_id", leadId);
    }

    if (tag) {
      query = query.contains("tags", [tag]);
    }

    const { data, error } = await query.order("fijada", { ascending: false }).order("updated_at", {
      ascending: false
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const filtered = buscar
      ? (data ?? []).filter((note) => matchesNotaSearch(note as Nota, buscar))
      : data ?? [];

    return NextResponse.json({ data: sortNotas(filtered as Nota[]) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    const body = (await request.json()) as CreateNotaInput;
    const supabase = createAdminClient();

    const payload = {
      titulo: body.titulo?.trim() || "Nueva nota",
      contenido: body.contenido ?? createEmptyTipTapContent(),
      carpeta_id: body.carpeta_id ?? null,
      fijada: body.fijada ?? false,
      en_papelera: body.en_papelera ?? false,
      eliminada_at: null,
      cliente_id: body.cliente_id ?? null,
      proyecto_id: body.proyecto_id ?? null,
      lead_id: body.lead_id ?? null,
      tags: sanitizeNotaTags(body.tags),
      creado_por: currentUser?.id ?? null
    };

    const { data, error } = await supabase.from("notas").insert(payload).select("*").single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
