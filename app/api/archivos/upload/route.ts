import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Archivo } from "@/types/archivos";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const BUCKET = "archivos-blyndtek";

function sanitizeFileName(value: string) {
  return value.replace(/[\\/<>:"|?*\x00-\x1F]/g, "_").trim() || "archivo";
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminUser();

    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const carpetaId = formData.get("carpeta_id")?.toString().trim() || null;
    const fileValue = formData.get("file") ?? formData.get("archivo");

    if (!carpetaId) {
      return NextResponse.json({ error: "carpeta_id is required" }, { status: 400 });
    }

    if (!(fileValue instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (fileValue.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "El archivo supera el límite de 50MB." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: carpeta, error: carpetaError } = await supabase
      .from("carpetas")
      .select("id")
      .eq("id", carpetaId)
      .maybeSingle();

    if (carpetaError) {
      return NextResponse.json({ error: carpetaError.message }, { status: 500 });
    }

    if (!carpeta) {
      return NextResponse.json({ error: "Carpeta not found" }, { status: 404 });
    }

    const [{ data: lastFolder }, { data: lastFile }] = await Promise.all([
      supabase
        .from("carpetas")
        .select("*")
        .eq("carpeta_padre_id", carpetaId)
        .order("orden", { ascending: false })
        .limit(1),
      supabase
        .from("archivos")
        .select("*")
        .eq("carpeta_id", carpetaId)
        .eq("en_papelera", false)
        .order("orden", { ascending: false })
        .limit(1)
    ]);

    const lastFolderItems = (lastFolder ?? []) as unknown as Array<{ orden?: number }>;
    const lastFileItems = (lastFile ?? []) as unknown as Array<{ orden?: number }>;
    const nextOrden = Math.max(Number(lastFolderItems[0]?.orden ?? 0), Number(lastFileItems[0]?.orden ?? 0)) + 1;

    const safeFileName = sanitizeFileName(fileValue.name);
    const storagePath = `${carpetaId}/${randomUUID()}-${safeFileName}`;
    const fileBuffer = Buffer.from(await fileValue.arrayBuffer());

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, fileBuffer, {
      contentType: fileValue.type || "application/octet-stream",
      upsert: false
    });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data, error } = await supabase
      .from("archivos")
      .insert({
        nombre: fileValue.name,
        carpeta_id: carpetaId,
        orden: nextOrden,
        storage_path: storagePath,
        tipo_mime: fileValue.type || null,
        tamanio_bytes: fileValue.size,
        en_papelera: false,
        eliminado_at: null,
        subido_por: admin.id
      } as never)
      .select(
        "id, nombre, carpeta_id, orden, storage_path, tipo_mime, tamanio_bytes, en_papelera, eliminado_at, subido_por, created_at"
      )
      .single();

    if (error) {
      await supabase.storage.from(BUCKET).remove([storagePath]);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data as unknown as Archivo }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
