import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrandManagerUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { CONTENT_BUCKET, getBlyndtekContentBrand } from "@/lib/contenido/blyndtek";
import type { ContenidoDatabase } from "@/types/contenido";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

type RouteContext = {
  params: {
    id: string;
  };
};

function normalizeExtension(filename: string, mimeType: string) {
  const fromName = filename.split(".").pop()?.toLowerCase() ?? "";
  if (fromName && fromName.length <= 5) return fromName;
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/gif") return "gif";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/avif") return "avif";
  return "png";
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const admin = await getBrandManagerUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") ?? formData.get("imagen");
    const slideIndexRaw = formData.get("slide_index");
    const slideIndex =
      typeof slideIndexRaw === "string" && slideIndexRaw.trim() !== "" ? Number.parseInt(slideIndexRaw, 10) : null;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No se recibió una imagen válida." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Solo se permiten imágenes." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "La imagen supera el límite de 5MB." }, { status: 400 });
    }

    const supabase = createAdminClient() as unknown as SupabaseClient<ContenidoDatabase>;
    const marca = await getBlyndtekContentBrand(supabase);

    if (!marca) {
      return NextResponse.json({ error: "Marca Blyndtek not found" }, { status: 404 });
    }

    const { data: pieza } = await supabase
      .from("piezas_contenido")
      .select("id, marca_id, storage_path, imagenes_generadas")
      .eq("id", params.id)
      .eq("marca_id", marca.id)
      .maybeSingle();

    const piezaActual = pieza as {
      id: string;
      marca_id: string;
      storage_path: string | null;
      imagenes_generadas: string[] | null;
    } | null;

    if (!piezaActual) {
      return NextResponse.json({ error: "Pieza not found" }, { status: 404 });
    }

    const extension = normalizeExtension(file.name, file.type);
    const generatedImages = Array.isArray(piezaActual.imagenes_generadas) ? [...piezaActual.imagenes_generadas] : [];
    const replacingSlide = slideIndex !== null && Number.isInteger(slideIndex);
    if (replacingSlide && (slideIndex < 0 || slideIndex >= generatedImages.length)) {
      return NextResponse.json({ error: "slide_index está fuera de rango." }, { status: 400 });
    }

    const storagePath = replacingSlide
      ? `contenido/${params.id}-slide-${slideIndex + 1}-manual.${extension}`
      : `contenido/${params.id}.${extension}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage.from(CONTENT_BUCKET).upload(storagePath, bytes, {
      contentType: file.type,
      upsert: true
    });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    if (replacingSlide && slideIndex !== null) {
      const oldSlidePath = generatedImages[slideIndex];
      generatedImages[slideIndex] = storagePath;

      if (oldSlidePath && oldSlidePath !== storagePath) {
        await supabase.storage.from(CONTENT_BUCKET).remove([oldSlidePath]);
      }
    } else if (piezaActual.storage_path && piezaActual.storage_path !== storagePath) {
      await supabase.storage.from(CONTENT_BUCKET).remove([piezaActual.storage_path]);
    }

    const updatePayload = replacingSlide
      ? {
          imagenes_generadas: generatedImages,
          storage_path: slideIndex === 0 ? storagePath : piezaActual.storage_path,
          updated_at: new Date().toISOString()
        }
      : { storage_path: storagePath, updated_at: new Date().toISOString() };

    const { data, error } = await supabase
      .from("piezas_contenido")
      .update(updatePayload as never)
      .eq("id", params.id)
      .select("*, pilar:pilares_contenido(*)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
