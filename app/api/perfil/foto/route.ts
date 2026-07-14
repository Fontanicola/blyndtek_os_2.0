import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "archivos-blyndtek";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function getExtension(file: File) {
  const mime = file.type.toLowerCase();

  if (mime === "image/png") {
    return "png";
  }

  if (mime === "image/webp") {
    return "webp";
  }

  if (mime === "image/gif") {
    return "gif";
  }

  if (mime === "image/jpeg" || mime === "image/jpg") {
    return "jpg";
  }

  return "png";
}

function getStoredPathFromFotoUrl(fotoUrl: string | null | undefined) {
  if (!fotoUrl) {
    return null;
  }

  const prefix = "/api/perfil/foto/";

  if (!fotoUrl.startsWith(prefix)) {
    return null;
  }

  return decodeURIComponent(fotoUrl.slice(prefix.length));
}

function buildFotoUrl(storagePath: string) {
  return `/api/perfil/foto/${encodeURIComponent(storagePath)}`;
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const formData = await request.formData();
    const fileField = formData.get("foto");

    if (!(fileField instanceof File)) {
      return NextResponse.json({ error: "Sube una imagen válida." }, { status: 400 });
    }

    if (!fileField.type.startsWith("image/")) {
      return NextResponse.json({ error: "El archivo debe ser una imagen." }, { status: 400 });
    }

    if (fileField.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "La imagen no puede superar 5MB." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const extension = getExtension(fileField);
    const storagePath = `perfiles/${currentUser.id}.${extension}`;
    const currentFotoPath = getStoredPathFromFotoUrl(currentUser.foto_url);

    if (currentFotoPath && currentFotoPath !== storagePath) {
      await supabase.storage.from(BUCKET).remove([currentFotoPath]);
    }

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(
      storagePath,
      fileField,
      {
        contentType: fileField.type,
        upsert: true
      }
    );

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 });
    }

    const fotoUrl = buildFotoUrl(storagePath);
    const { data, error } = await supabase
      .from("usuarios")
      .update({ foto_url: fotoUrl })
      .eq("id", currentUser.id)
      .select("id, nombre, email, rol, google_calendar_token, foto_url, activo, created_at")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "No se pudo guardar la foto." },
        { status: 400 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const currentFotoPath = getStoredPathFromFotoUrl(currentUser.foto_url);

    if (currentFotoPath) {
      const { error: removeError } = await supabase.storage.from(BUCKET).remove([currentFotoPath]);

      if (removeError) {
        return NextResponse.json({ error: removeError.message }, { status: 400 });
      }
    }

    const { data, error } = await supabase
      .from("usuarios")
      .update({ foto_url: null })
      .eq("id", currentUser.id)
      .select("id, nombre, email, rol, google_calendar_token, foto_url, activo, created_at")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "No se pudo quitar la foto." },
        { status: 400 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
