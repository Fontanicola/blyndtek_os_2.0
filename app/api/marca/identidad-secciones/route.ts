import { NextResponse } from "next/server";
import { getBrandManagerUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBlyndtekContentBrand } from "@/lib/contenido/blyndtek";
import type { ContenidoDatabase } from "@/types/contenido";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function GET() {
  const user = await getBrandManagerUser();
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const supabase = createAdminClient() as unknown as SupabaseClient<ContenidoDatabase>;
  const marca = await getBlyndtekContentBrand(supabase);
  if (!marca) return NextResponse.json({ error: "No se encontró la marca." }, { status: 404 });

  const { data, error } = await supabase
    .from("marca_identidad_secciones")
    .select("*")
    .eq("marca_id", marca.id)
    .eq("visible", true)
    .order("orden", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function PATCH(request: Request) {
  const user = await getBrandManagerUser();
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const body = (await request.json()) as { secciones?: Array<{ clave: string; titulo: string; contenido: string; orden?: number }> };
  if (!Array.isArray(body.secciones)) return NextResponse.json({ error: "Secciones inválidas." }, { status: 400 });

  const supabase = createAdminClient() as unknown as SupabaseClient<ContenidoDatabase>;
  const marca = await getBlyndtekContentBrand(supabase);
  if (!marca) return NextResponse.json({ error: "No se encontró la marca." }, { status: 404 });

  const rows = body.secciones
    .filter((section) => section.clave && section.titulo)
    .map((section, index) => ({
      marca_id: marca.id,
      clave: section.clave,
      titulo: section.titulo,
      contenido: section.contenido ?? "",
      orden: section.orden ?? index,
      updated_by: user.id,
      updated_at: new Date().toISOString()
    }));

  const { data, error } = await supabase
    .from("marca_identidad_secciones")
    .upsert(rows as never, { onConflict: "marca_id,clave" })
    .select("*")
    .order("orden", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}
