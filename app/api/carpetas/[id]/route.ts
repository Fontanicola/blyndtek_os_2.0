import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUsuarioAccederCarpetaCompartida, getCarpetaContenido } from "@/lib/carpetas";
import type { Carpeta } from "@/types/archivos";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    if (currentUser.rol !== "admin" && currentUser.rol !== "comercial") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();

    if (currentUser.rol === "comercial") {
      const canAccess = await canUsuarioAccederCarpetaCompartida(supabase, currentUser.id, context.params.id);

      if (!canAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const data = await getCarpetaContenido(supabase, context.params.id);

    if (!data) {
      return NextResponse.json({ error: "Carpeta not found" }, { status: 404 });
    }

    return NextResponse.json({ data: data as unknown as Carpeta });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const admin = await getAdminUser();

    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as Partial<Pick<Carpeta, "nombre">>;
    const nombre = body.nombre?.trim() ?? "";

    if (!nombre) {
      return NextResponse.json({ error: "nombre is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: folder, error: folderError } = await supabase
      .from("carpetas")
      .select("id, es_automatica")
      .eq("id", context.params.id)
      .maybeSingle();

    if (folderError) {
      return NextResponse.json({ error: folderError.message }, { status: 500 });
    }

    if (!folder) {
      return NextResponse.json({ error: "Carpeta not found" }, { status: 404 });
    }

    if ((folder as { es_automatica: boolean }).es_automatica) {
      return NextResponse.json(
        { error: "No se puede renombrar una carpeta automática." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("carpetas")
      .update({ nombre })
      .eq("id", context.params.id)
      .select("id, nombre, seccion, orden, carpeta_padre_id, cliente_id, proyecto_id, es_automatica, creado_por, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data as unknown as Carpeta });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const admin = await getAdminUser();

    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { data: folder, error: folderError } = await supabase
      .from("carpetas")
      .select("id, es_automatica")
      .eq("id", context.params.id)
      .maybeSingle();

    if (folderError) {
      return NextResponse.json({ error: folderError.message }, { status: 500 });
    }

    if (!folder) {
      return NextResponse.json({ error: "Carpeta not found" }, { status: 404 });
    }

    if ((folder as { es_automatica: boolean }).es_automatica) {
      return NextResponse.json(
        { error: "No se puede eliminar una carpeta automática." },
        { status: 400 }
      );
    }

    const [subcarpetas, archivos] = await Promise.all([
      supabase.from("carpetas").select("id", { count: "exact", head: true }).eq("carpeta_padre_id", context.params.id),
      supabase
        .from("archivos")
        .select("id", { count: "exact", head: true })
        .eq("carpeta_id", context.params.id)
        .eq("en_papelera", false)
    ]);

    if (subcarpetas.error) {
      return NextResponse.json({ error: subcarpetas.error.message }, { status: 500 });
    }

    if (archivos.error) {
      return NextResponse.json({ error: archivos.error.message }, { status: 500 });
    }

    if ((subcarpetas.count ?? 0) > 0 || (archivos.count ?? 0) > 0) {
      return NextResponse.json({ error: "La carpeta no está vacía." }, { status: 400 });
    }

    const { error } = await supabase.from("carpetas").delete().eq("id", context.params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
