import { NextRequest, NextResponse } from "next/server";
import { getBrandManagerUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Archivo } from "@/types/archivos";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const admin = await getBrandManagerUser();

    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as {
      nueva_carpeta_id?: string | null;
    };
    const nuevaCarpetaId = body.nueva_carpeta_id?.trim() || null;
    const supabase = createAdminClient();

    if (nuevaCarpetaId) {
      const { data: carpeta, error: carpetaError } = await supabase
        .from("carpetas")
        .select("id, seccion")
        .eq("id", nuevaCarpetaId)
        .maybeSingle();

      if (carpetaError) {
        return NextResponse.json({ error: carpetaError.message }, { status: 500 });
      }

      if (!carpeta) {
        return NextResponse.json({ error: "Carpeta not found" }, { status: 404 });
      }
    }

    const folderQuery = supabase.from("carpetas").select("orden");
    const fileQuery = supabase.from("archivos").select("orden").eq("en_papelera", false);

    const [lastFolder, lastFile] = (await Promise.all([
      (nuevaCarpetaId ? folderQuery.eq("carpeta_padre_id", nuevaCarpetaId) : folderQuery.is("carpeta_padre_id", null))
        .order("orden", { ascending: false })
        .limit(1),
      (nuevaCarpetaId ? fileQuery.eq("carpeta_id", nuevaCarpetaId) : fileQuery.is("carpeta_id", null))
        .order("orden", { ascending: false })
        .limit(1)
    ])) as unknown as [
      { data: Array<{ orden: number }> | null; error: { message: string } | null },
      { data: Array<{ orden: number }> | null; error: { message: string } | null }
    ];

    if (lastFolder.error) {
      return NextResponse.json({ error: lastFolder.error.message }, { status: 500 });
    }

    if (lastFile.error) {
      return NextResponse.json({ error: lastFile.error.message }, { status: 500 });
    }

    const nextOrden = Math.max(Number(lastFolder.data?.[0]?.orden ?? 0), Number(lastFile.data?.[0]?.orden ?? 0)) + 1;

    const { data, error } = await supabase
      .from("archivos")
      .update({ carpeta_id: nuevaCarpetaId, orden: nextOrden } as never)
      .eq("id", context.params.id)
      .select(
        "id, nombre, carpeta_id, orden, storage_path, tipo_mime, tamanio_bytes, en_papelera, eliminado_at, subido_por, created_at"
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
