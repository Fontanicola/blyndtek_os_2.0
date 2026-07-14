import { NextRequest, NextResponse } from "next/server";
import { normalizeNotaEtiquetaColor } from "@/lib/notas";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NotaEtiqueta } from "@/types/notasEtiquetas";

type NotesRow = {
  tags: string[] | null;
};

function normalizeNombre(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export async function GET() {
  try {
    const supabase = createAdminClient();
    const [etiquetasResult, notasResult] = await Promise.all([
      supabase.from("notas_etiquetas").select("*").order("created_at", { ascending: false }),
      supabase.from("notas").select("tags").eq("en_papelera", false)
    ]);

    if (etiquetasResult.error) {
      return NextResponse.json({ error: etiquetasResult.error.message }, { status: 500 });
    }

    if (notasResult.error) {
      return NextResponse.json({ error: notasResult.error.message }, { status: 500 });
    }

    const counts = new Map<string, number>();
    (notasResult.data ?? []).forEach((row) => {
      (row as NotesRow).tags?.forEach((tag) => {
        const normalized = normalizeNombre(tag);
        if (!normalized) {
          return;
        }

        counts.set(normalized.toLowerCase(), (counts.get(normalized.toLowerCase()) ?? 0) + 1);
      });
    });

    const ordered = (etiquetasResult.data ?? [])
      .map((row) => row as NotaEtiqueta)
      .sort((first, second) => {
        const firstCount = counts.get(first.nombre.toLowerCase()) ?? 0;
        const secondCount = counts.get(second.nombre.toLowerCase()) ?? 0;
        return secondCount - firstCount || first.nombre.localeCompare(second.nombre, "es");
      });

    return NextResponse.json({ data: ordered });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { nombre?: unknown; color?: unknown };
    const nombre = normalizeNombre(body.nombre);

    if (!nombre) {
      return NextResponse.json({ error: "El nombre de la etiqueta es obligatorio." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const color = normalizeNotaEtiquetaColor(body.color);

    const { data: existing } = await supabase
      .from("notas_etiquetas")
      .select("*")
      .ilike("nombre", nombre)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ data: existing as NotaEtiqueta });
    }

    const { data, error } = await supabase
      .from("notas_etiquetas")
      .insert({
        nombre,
        color
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data as NotaEtiqueta }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
