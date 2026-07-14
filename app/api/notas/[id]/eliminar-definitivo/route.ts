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

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data, error: fetchError } = await supabase
      .from("notas")
      .select("id, en_papelera")
      .eq("id", params.id)
      .single();

    if (fetchError) {
      const status = fetchError.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: fetchError.message }, { status });
    }

    if (!data?.en_papelera) {
      return NextResponse.json({ error: "La nota debe estar en papelera antes de eliminarla." }, { status: 400 });
    }

    const { data: existingNote, error: noteError } = await supabase
      .from("notas")
      .select("id, creado_por")
      .eq("id", params.id)
      .single();

    if (noteError) {
      const status = noteError.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: noteError.message }, { status });
    }

    if (!existingNote) {
      return NextResponse.json({ error: "Nota no encontrada." }, { status: 404 });
    }

    const canAccess = await canUsuarioAccederNota(supabase, existingNote as Pick<Nota, "id" | "creado_por">, currentUser);

    if (!canAccess) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { error } = await supabase.from("notas").delete().eq("id", params.id);

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
