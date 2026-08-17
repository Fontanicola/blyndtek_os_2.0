import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrandManagerUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBlyndtekContentBrand } from "@/lib/contenido/blyndtek";
import type { CanalContenido, ContenidoDatabase } from "@/types/contenido";

const DEFAULT_CHANNELS: Array<Pick<CanalContenido, "nombre" | "slug" | "plataforma" | "color" | "orden">> = [
  { nombre: "LinkedIn", slug: "linkedin", plataforma: "linkedin_post", color: "blue", orden: 0 },
  { nombre: "Historias", slug: "historias", plataforma: "instagram_story", color: "violet", orden: 1 },
  { nombre: "Instagram Feed", slug: "instagram-feed", plataforma: "instagram_feed", color: "pink", orden: 2 }
];

export async function GET() {
  try {
    if (!(await getBrandManagerUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const supabase = createAdminClient() as unknown as SupabaseClient<ContenidoDatabase>;
    const marca = await getBlyndtekContentBrand(supabase);
    if (!marca) return NextResponse.json({ error: "Marca Blyndtek not found" }, { status: 404 });

    const { data, error } = await supabase.from("canales_contenido").select("*").eq("marca_id", marca.id).eq("activo", true).order("orden", { ascending: true });
    if (error) {
      // La migración puede tardar en aplicarse en el proyecto remoto. Mientras tanto,
      // mostramos los canales base para que el timeline siga siendo usable.
      if (error.code === "PGRST205") {
        const fallback = DEFAULT_CHANNELS.map((channel) => ({ ...channel, id: `default-${channel.slug}`, marca_id: marca.id, activo: true, created_at: "" }));
        return NextResponse.json({ data: fallback });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unexpected error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await getBrandManagerUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const body = (await request.json()) as Partial<Pick<CanalContenido, "nombre" | "plataforma" | "color">>;
    const nombre = body.nombre?.trim();
    if (!nombre) return NextResponse.json({ error: "El nombre del canal es obligatorio." }, { status: 400 });
    const supabase = createAdminClient() as unknown as SupabaseClient<ContenidoDatabase>;
    const marca = await getBlyndtekContentBrand(supabase);
    if (!marca) return NextResponse.json({ error: "Marca Blyndtek not found" }, { status: 404 });
    const slug = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const plataforma = body.plataforma?.trim() || `custom_${slug}`;
    const { count } = await supabase.from("canales_contenido").select("id", { count: "exact", head: true }).eq("marca_id", marca.id);
    const { data, error } = await supabase.from("canales_contenido").insert({ marca_id: marca.id, nombre, slug, plataforma, color: body.color || "signal", orden: count ?? 0 } as never).select("*").single();
    if (error) {
      if (error.code === "PGRST205") {
        return NextResponse.json({ error: "Aplicá la migración 035_canales_contenido.sql en Supabase para poder crear canales personalizados." }, { status: 503 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unexpected error" }, { status: 500 });
  }
}
