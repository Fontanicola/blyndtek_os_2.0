import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canUsuarioAccederNota } from "@/lib/notas/acceso";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Nota } from "@/types/notas";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function POST(_request: NextRequest, { params }: RouteContext) {
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
        en_papelera: false,
        eliminada_at: null
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
