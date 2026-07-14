import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "archivos-blyndtek";
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

function normalizeExtension(filename: string | null, mimeType: string | null) {
  const fromName = filename?.split(".").pop()?.toLowerCase() ?? "";
  if (fromName && fromName.length <= 5) {
    return fromName;
  }

  const mime = mimeType ?? "";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/gif") return "gif";
  if (mime === "image/webp") return "webp";
  if (mime === "image/avif") return "avif";
  return "png";
}

function base64ToBytes(input: string) {
  const cleaned = input.includes(",") ? input.split(",").pop() ?? "" : input;
  return Uint8Array.from(Buffer.from(cleaned, "base64"));
}

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient();
    const contentType = request.headers.get("content-type") ?? "";

    let bytes: Uint8Array;
    let mimeType: string | null = null;
    let filename: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");

      if (!(file instanceof File)) {
        return NextResponse.json({ error: "No se recibió una imagen válida." }, { status: 400 });
      }

      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "Solo se permiten imágenes." }, { status: 400 });
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json({ error: "La imagen supera el límite permitido de 50MB." }, { status: 400 });
      }

      bytes = new Uint8Array(await file.arrayBuffer());
      mimeType = file.type;
      filename = file.name;
    } else {
      const body = (await request.json()) as {
        imageBase64?: string;
        mimeType?: string;
        filename?: string;
      };

      if (!body.imageBase64) {
        return NextResponse.json({ error: "No se recibió una imagen válida." }, { status: 400 });
      }

      mimeType = body.mimeType ?? "image/png";
      filename = body.filename ?? null;
      bytes = base64ToBytes(body.imageBase64);

      if (bytes.byteLength > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json({ error: "La imagen supera el límite permitido de 50MB." }, { status: 400 });
      }
    }

    const extension = normalizeExtension(filename, mimeType);
    const storagePath = `notas-inline/${randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, bytes, {
      contentType: mimeType ?? `image/${extension}`,
      upsert: false
    });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        url: `/api/notas/imagenes/${encodeURIComponent(storagePath)}`
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
