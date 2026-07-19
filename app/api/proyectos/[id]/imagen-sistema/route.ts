import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Proyecto } from "@/types/proyectos";

const BUCKET = "archivos-blyndtek";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

type RouteContext = {
  params: {
    id: string;
  };
};

type ProyectoImagenRecord = {
  id: string;
  imagen_sistema_storage_path: string | null;
};

function getExtension(file: File) {
  const mime = file.type.toLowerCase();

  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  if (mime === "image/avif") return "avif";

  return null;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const adminUser = await getAdminUser();

    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("imagen");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Sube una imagen válida." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "El archivo debe ser una imagen." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "La imagen no puede superar 5MB." }, { status: 400 });
    }

    const extension = getExtension(file);

    if (!extension) {
      return NextResponse.json({ error: "Formato de imagen no soportado." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: proyectoActual, error: proyectoError } = await supabase
      .from("proyectos")
      .select("id, imagen_sistema_storage_path")
      .eq("id", params.id)
      .maybeSingle<ProyectoImagenRecord>();

    if (proyectoError) {
      return NextResponse.json({ error: proyectoError.message }, { status: 500 });
    }

    if (!proyectoActual) {
      return NextResponse.json({ error: "Proyecto no encontrado." }, { status: 404 });
    }

    const storagePath = `roadmap-sistema/${params.id}.${extension}`;

    if (
      proyectoActual.imagen_sistema_storage_path &&
      proyectoActual.imagen_sistema_storage_path !== storagePath
    ) {
      await supabase.storage.from(BUCKET).remove([proyectoActual.imagen_sistema_storage_path]);
    }

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
      contentType: file.type,
      upsert: true
    });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("proyectos")
      .update({ imagen_sistema_storage_path: storagePath })
      .eq("id", params.id)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "No se pudo guardar la imagen del sistema." },
        { status: 400 }
      );
    }

    return NextResponse.json({ data: data as Proyecto });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const adminUser = await getAdminUser();

    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { data: proyectoActual, error: proyectoError } = await supabase
      .from("proyectos")
      .select("id, imagen_sistema_storage_path")
      .eq("id", params.id)
      .maybeSingle<ProyectoImagenRecord>();

    if (proyectoError) {
      return NextResponse.json({ error: proyectoError.message }, { status: 500 });
    }

    if (!proyectoActual) {
      return NextResponse.json({ error: "Proyecto no encontrado." }, { status: 404 });
    }

    if (proyectoActual.imagen_sistema_storage_path) {
      const { error: removeError } = await supabase.storage
        .from(BUCKET)
        .remove([proyectoActual.imagen_sistema_storage_path]);

      if (removeError) {
        return NextResponse.json({ error: removeError.message }, { status: 400 });
      }
    }

    const { data, error } = await supabase
      .from("proyectos")
      .update({ imagen_sistema_storage_path: null })
      .eq("id", params.id)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "No se pudo quitar la imagen del sistema." },
        { status: 400 }
      );
    }

    return NextResponse.json({ data: data as Proyecto });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
