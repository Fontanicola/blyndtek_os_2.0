import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    if (currentUser.rol !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as { usuario_id?: string };
    const usuarioId = body.usuario_id?.trim() ?? "";

    if (!usuarioId) {
      return NextResponse.json({ error: "usuario_id is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: carpeta, error: carpetaError } = await supabase
      .from("carpetas")
      .select("id, seccion")
      .eq("id", context.params.id)
      .maybeSingle();

    if (carpetaError) {
      return NextResponse.json({ error: carpetaError.message }, { status: 500 });
    }

    if (!carpeta) {
      return NextResponse.json({ error: "Carpeta not found" }, { status: 404 });
    }

    const { data: existing, error: existingError } = await supabase
      .from("carpetas_compartidas")
      .select("id")
      .eq("carpeta_id", context.params.id)
      .eq("usuario_id", usuarioId)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ data: existing });
    }

    const { data, error } = await supabase
      .from("carpetas_compartidas")
      .insert({
        carpeta_id: context.params.id,
        usuario_id: usuarioId,
        compartido_por: currentUser.id
      } as never)
      .select("id, carpeta_id, usuario_id, compartido_por, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
