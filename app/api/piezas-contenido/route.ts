import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBlyndtekContentBrand } from "@/lib/contenido/blyndtek";
import type { ContenidoDatabase, PiezaContenido, PiezaContenidoEstado } from "@/types/contenido";

const VALID_ESTADOS = new Set<PiezaContenidoEstado>([
  "idea",
  "en_diseno",
  "lista",
  "programada",
  "publicada",
  "fallida"
]);

export async function GET(request: Request) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient() as unknown as SupabaseClient<ContenidoDatabase>;
    const marca = await getBlyndtekContentBrand(supabase);

    if (!marca) {
      return NextResponse.json({ error: "Marca Blyndtek not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const estado = url.searchParams.get("estado");
    const pilarId = url.searchParams.get("pilar_id");
    let query = supabase
      .from("piezas_contenido")
      .select("*, pilar:pilares_contenido(*), plan:planes_semanales(*)")
      .eq("marca_id", marca.id)
      .order("updated_at", { ascending: false });

    if (estado && VALID_ESTADOS.has(estado as PiezaContenidoEstado)) {
      query = query.eq("estado", estado as PiezaContenidoEstado);
    }

    if (pilarId) {
      query = query.eq("pilar_id", pilarId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as Partial<Pick<PiezaContenido, "titulo" | "pilar_id">>;
    const supabase = createAdminClient() as unknown as SupabaseClient<ContenidoDatabase>;
    const marca = await getBlyndtekContentBrand(supabase);

    if (!marca) {
      return NextResponse.json({ error: "Marca Blyndtek not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("piezas_contenido")
      .insert({
        marca_id: marca.id,
        titulo: body.titulo?.trim() || "Sin título",
        pilar_id: body.pilar_id || null,
        tipo_pieza: null,
        estado: "idea",
        creado_por: admin.id
      } as never)
      .select("*, pilar:pilares_contenido(*), plan:planes_semanales(*)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
