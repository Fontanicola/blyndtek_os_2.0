import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContenidoDatabase, MarcaContenido } from "@/types/contenido";

export const BLYNDTEK_CONTENT_SLUG = "blyndtek";
export const CONTENT_BUCKET = "archivos-blyndtek";

export async function getBlyndtekContentBrand(
  supabase: SupabaseClient<ContenidoDatabase>
): Promise<MarcaContenido | null> {
  const { data, error } = await supabase
    .from("marcas_contenido")
    .select("*")
    .eq("slug", BLYNDTEK_CONTENT_SLUG)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}
