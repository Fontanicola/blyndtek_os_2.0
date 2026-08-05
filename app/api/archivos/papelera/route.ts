import { NextResponse } from "next/server";
import { getBrandManagerUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Archivo } from "@/types/archivos";

export async function GET() {
  try {
    const admin = await getBrandManagerUser();

    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("archivos")
      .select(
        "id, nombre, carpeta_id, storage_path, tipo_mime, tamanio_bytes, en_papelera, eliminado_at, subido_por, created_at"
      )
      .eq("en_papelera", true)
      .order("eliminado_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: (data ?? []) as unknown as Archivo[] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
