import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Archivo } from "@/types/archivos";

type ImagenReferencia = {
  id: string;
  label: string;
  sublabel: string;
  url: string;
};

export async function GET() {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("archivos")
      .select("id, nombre, carpeta_id, storage_path, tipo_mime, tamanio_bytes, en_papelera, eliminado_at, subido_por, created_at, orden")
      .eq("en_papelera", false)
      .ilike("tipo_mime", "image/%")
      .order("created_at", { ascending: false })
      .limit(80);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const referencias: ImagenReferencia[] = ((data ?? []) as unknown as Archivo[]).map((archivo) => ({
      id: archivo.id,
      label: archivo.nombre,
      sublabel: archivo.tipo_mime ?? "Imagen",
      url: `/api/archivos/${archivo.id}/descargar`
    }));

    return NextResponse.json({ data: referencias });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
