import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canUsuarioAccederCarpetaCompartida } from "@/lib/carpetas";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Archivo } from "@/types/archivos";

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

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("archivos")
      .select(
        "id, nombre, carpeta_id, storage_path, tipo_mime, tamanio_bytes, en_papelera, eliminado_at, subido_por, created_at"
      )
      .eq("id", context.params.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Archivo not found" }, { status: 404 });
    }

    if (currentUser.rol !== "admin") {
      if (!data.carpeta_id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const canAccess = await canUsuarioAccederCarpetaCompartida(
        supabase,
        currentUser.id,
        data.carpeta_id
      );

      if (!canAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json({ data: data as unknown as Archivo });
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

    const body = (await request.json()) as Partial<Pick<Archivo, "nombre">>;
    const nombre = body.nombre?.trim() ?? "";

    if (!nombre) {
      return NextResponse.json({ error: "nombre is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("archivos")
      .update({ nombre })
      .eq("id", context.params.id)
      .select(
        "id, nombre, carpeta_id, storage_path, tipo_mime, tamanio_bytes, en_papelera, eliminado_at, subido_por, created_at"
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data as unknown as Archivo });
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
    const { data: archivo, error: archivoError } = await supabase
      .from("archivos")
      .select("id, en_papelera")
      .eq("id", context.params.id)
      .maybeSingle();

    if (archivoError) {
      return NextResponse.json({ error: archivoError.message }, { status: 500 });
    }

    if (!archivo) {
      return NextResponse.json({ error: "Archivo not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("archivos")
      .update({
        en_papelera: true,
        eliminado_at: new Date().toISOString()
      })
      .eq("id", context.params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
