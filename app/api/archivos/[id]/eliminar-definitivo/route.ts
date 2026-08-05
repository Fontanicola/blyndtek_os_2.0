import { NextRequest, NextResponse } from "next/server";
import { getBrandManagerUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: {
    id: string;
  };
};

const BUCKET = "archivos-blyndtek";

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const admin = await getBrandManagerUser();

    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { data: archivo, error: archivoError } = await supabase
      .from("archivos")
      .select("id, storage_path, en_papelera")
      .eq("id", context.params.id)
      .maybeSingle();

    if (archivoError) {
      return NextResponse.json({ error: archivoError.message }, { status: 500 });
    }

    if (!archivo) {
      return NextResponse.json({ error: "Archivo not found" }, { status: 404 });
    }

    if (!archivo.en_papelera) {
      return NextResponse.json(
        { error: "Solo se puede eliminar definitivamente un archivo que ya esté en papelera." },
        { status: 400 }
      );
    }

    const { error: storageError } = await supabase.storage.from(BUCKET).remove([archivo.storage_path]);

    if (storageError) {
      return NextResponse.json({ error: storageError.message }, { status: 500 });
    }

    const { error } = await supabase.from("archivos").delete().eq("id", context.params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
