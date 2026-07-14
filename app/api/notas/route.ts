import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { fetchNotasCompartidasNotaIds } from "@/lib/notas/acceso";
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

function applyNotaFilters(
  query: ReturnType<ReturnType<typeof createAdminClient>["from"]>,
  params: {
    carpetaId: string | null;
    fijadas: boolean | null;
    papelera: boolean | null;
    clienteId: string | null;
    proyectoId: string | null;
    leadId: string | null;
    tag: string | null;
  }
) {
  let next = query;

  if (params.carpetaId) {
    next = next.eq("carpeta_id", params.carpetaId);
  }

  if (params.fijadas !== null) {
    next = next.eq("fijada", params.fijadas);
  }

  if (params.papelera !== null) {
    next = next.eq("en_papelera", params.papelera);
  } else {
    next = next.eq("en_papelera", false);
  }

  if (params.clienteId) {
    next = next.eq("cliente_id", params.clienteId);
  }

  if (params.proyectoId) {
    next = next.eq("proyecto_id", params.proyectoId);
  }

  if (params.leadId) {
    next = next.eq("lead_id", params.leadId);
  }

  if (params.tag) {
    next = next.contains("tags", [params.tag]);
  }

  return next.order("fijada", { ascending: false }).order("updated_at", { ascending: false });
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const carpetaId = optionalTrim(searchParams.get("carpeta_id"));
    const fijadas = parseBoolean(searchParams.get("fijadas"));
    const papelera = parseBoolean(searchParams.get("papelera"));
    const buscar = optionalTrim(searchParams.get("buscar"));
    const clienteId = optionalTrim(searchParams.get("cliente_id"));
    const proyectoId = optionalTrim(searchParams.get("proyecto_id"));
    const leadId = optionalTrim(searchParams.get("lead_id"));
    const tag = optionalTrim(searchParams.get("tag"));

    const buildQuery = () =>
      applyNotaFilters(supabase.from("notas").select("*"), {
        carpetaId,
        fijadas,
        papelera,
        clienteId,
        proyectoId,
        leadId,
        tag
      });

    let data: Nota[] = [];

    if (currentUser.rol === "comercial") {
      const sharedIds = await fetchNotasCompartidasNotaIds(supabase, currentUser.id);

      const ownQuery = buildQuery().eq("creado_por", currentUser.id);
      const sharedQuery = sharedIds.length > 0 ? buildQuery().in("id", sharedIds) : null;

      const [ownResult, sharedResult] = await Promise.all([
        ownQuery,
        sharedQuery ?? Promise.resolve({ data: [], error: null })
      ]);

      if ("error" in ownResult && ownResult.error) {
        return NextResponse.json({ error: ownResult.error.message }, { status: 500 });
      }

      if ("error" in sharedResult && sharedResult.error) {
        return NextResponse.json({ error: sharedResult.error.message }, { status: 500 });
      }

      const combined = [...((ownResult.data ?? []) as Nota[]), ...((sharedResult.data ?? []) as Nota[])];
      const deduped = Array.from(new Map(combined.map((note) => [note.id, note])).values());
      data = deduped;
    } else {
      const { data: noteRows, error } = await buildQuery();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      data = (noteRows ?? []) as Nota[];
    }

    const filtered = buscar ? data.filter((note) => matchesNotaSearch(note, buscar)) : data;

    return NextResponse.json({ data: sortNotas(filtered) });
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
