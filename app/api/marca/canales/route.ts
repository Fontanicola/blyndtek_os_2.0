import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrandManagerUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBlyndtekContentBrand } from "@/lib/contenido/blyndtek";
import type { CanalContenido, ContenidoDatabase } from "@/types/contenido";

export async function GET() {
  try {
    if (!(await getBrandManagerUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const supabase = createAdminClient() as unknown as SupabaseClient<ContenidoDatabase>;
    const marca = await getBlyndtekContentBrand(supabase);
    if (!marca) return NextResponse.json({ error: "Marca Blyndtek not found" }, { status: 404 });

    const { data, error } = await supabase.from("canales_contenido").select("*").eq("marca_id", marca.id).eq("activo", true).order("orden", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unexpected error" }, { status: 500 });
  }
}
