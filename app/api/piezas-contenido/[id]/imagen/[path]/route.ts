import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { CONTENT_BUCKET, getBlyndtekContentBrand } from "@/lib/contenido/blyndtek";
import type { ContenidoDatabase } from "@/types/contenido";

type RouteContext = {
  params: {
    id: string;
    path: string;
  };
};

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const storagePath = decodeURIComponent(params.path);
    const supabase = createAdminClient() as unknown as SupabaseClient<ContenidoDatabase>;
    const marca = await getBlyndtekContentBrand(supabase);

    if (!marca) {
      return NextResponse.json({ error: "Marca Blyndtek not found" }, { status: 404 });
    }

    const { data: pieza } = await supabase
      .from("piezas_contenido")
      .select("id, storage_path, fondo_storage_path, imagenes_generadas")
      .eq("id", params.id)
      .eq("marca_id", marca.id)
      .maybeSingle();

    const piezaActual = pieza as {
      id: string;
      storage_path: string | null;
      fondo_storage_path: string | null;
      imagenes_generadas: string[] | null;
    } | null;
    const allowedPaths = new Set([
      piezaActual?.storage_path,
      piezaActual?.fondo_storage_path,
      ...(Array.isArray(piezaActual?.imagenes_generadas) ? piezaActual.imagenes_generadas : [])
    ].filter((path): path is string => Boolean(path)));

    if (!piezaActual || !allowedPaths.has(storagePath)) {
      return NextResponse.json({ error: "Imagen not found" }, { status: 404 });
    }

    const { data, error } = await supabase.storage.from(CONTENT_BUCKET).download(storagePath);

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "No se pudo leer la imagen." }, { status: 404 });
    }

    const arrayBuffer = await data.arrayBuffer();

    return new Response(arrayBuffer, {
      headers: {
        "Content-Type": data.type || "application/octet-stream",
        "Cache-Control": "private, max-age=0, must-revalidate"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
