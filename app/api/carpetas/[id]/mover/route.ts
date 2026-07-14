import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getCarpetaById,
  validateCarpetaParentSection,
  wouldCreateCarpetaCycle
} from "@/lib/carpetas";
import type { Carpeta } from "@/types/archivos";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const admin = await getAdminUser();

    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as {
      nueva_carpeta_padre_id?: string | null;
    };
    const nuevaCarpetaPadreId = body.nueva_carpeta_padre_id?.trim() || null;
    const supabase = createAdminClient();

    const carpeta = await getCarpetaById(supabase, context.params.id);

    if (!carpeta) {
      return NextResponse.json({ error: "Carpeta not found" }, { status: 404 });
    }

    if (nuevaCarpetaPadreId) {
      const sectionError = await validateCarpetaParentSection(
        supabase,
        context.params.id,
        nuevaCarpetaPadreId
      );

      if (sectionError) {
        return NextResponse.json({ error: sectionError }, { status: 400 });
      }

      const wouldCycle = await wouldCreateCarpetaCycle(supabase, context.params.id, nuevaCarpetaPadreId);

      if (wouldCycle) {
        return NextResponse.json(
          { error: "No se puede mover una carpeta dentro de sí misma o de una descendiente." },
          { status: 400 }
        );
      }
    }

    const folderQuery = supabase.from("carpetas").select("orden").eq("seccion", carpeta.seccion);
    const fileQuery = supabase.from("archivos").select("orden");

    const [folderResult, fileResult] = (await Promise.all([
      (nuevaCarpetaPadreId ? folderQuery.eq("carpeta_padre_id", nuevaCarpetaPadreId) : folderQuery.is("carpeta_padre_id", null))
        .order("orden", { ascending: false })
        .limit(1),
      (nuevaCarpetaPadreId ? fileQuery.eq("carpeta_id", nuevaCarpetaPadreId) : fileQuery.is("carpeta_id", null))
        .eq("en_papelera", false)
        .order("orden", { ascending: false })
        .limit(1)
    ])) as unknown as [
      { data: Array<{ orden: number }> | null; error: { message: string } | null },
      { data: Array<{ orden: number }> | null; error: { message: string } | null }
    ];

    if (folderResult.error) {
      return NextResponse.json({ error: folderResult.error.message }, { status: 500 });
    }

    if (fileResult.error) {
      return NextResponse.json({ error: fileResult.error.message }, { status: 500 });
    }

    const nextOrden = Math.max(Number(folderResult.data?.[0]?.orden ?? 0), Number(fileResult.data?.[0]?.orden ?? 0)) + 1;

    const { data, error } = await supabase
      .from("carpetas")
      .update({ carpeta_padre_id: nuevaCarpetaPadreId, orden: nextOrden } as never)
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
