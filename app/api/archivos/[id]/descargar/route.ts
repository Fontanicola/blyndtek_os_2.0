import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canUsuarioAccederCarpetaCompartida } from "@/lib/carpetas";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: {
    id: string;
  };
};

const BUCKET = "archivos-blyndtek";

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: archivo, error: archivoError } = await supabase
      .from("archivos")
      .select("storage_path, nombre, tipo_mime, carpeta_id")
      .eq("id", context.params.id)
      .maybeSingle();

    if (archivoError) {
      return NextResponse.json({ error: archivoError.message }, { status: 500 });
    }

    if (!archivo) {
      return NextResponse.json({ error: "Archivo not found" }, { status: 404 });
    }

    if (currentUser.rol !== "admin") {
      if (!archivo.carpeta_id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const canAccess = await canUsuarioAccederCarpetaCompartida(
        supabase,
        currentUser.id,
        archivo.carpeta_id
      );

      if (!canAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const { data, error } = await supabase.storage.from(BUCKET).download(archivo.storage_path);

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "No se pudo generar la descarga." }, { status: 500 });
    }

    const descargar = _request.nextUrl.searchParams.get("descargar") === "true";
    const headers = new Headers();
    headers.set("Content-Type", archivo.tipo_mime || data.type || "application/octet-stream");
    headers.set("Content-Disposition", `${descargar ? "attachment" : "inline"}; filename="${archivo.nombre}"`);

    return new NextResponse(data, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
