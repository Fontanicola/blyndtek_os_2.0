import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrandManagerUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBlyndtekContentBrand } from "@/lib/contenido/blyndtek";
import type { ContenidoDatabase, FeedSlotContenido } from "@/types/contenido";

export async function GET(request: Request) {
  try {
    if (!(await getBrandManagerUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const supabase = createAdminClient() as unknown as SupabaseClient<ContenidoDatabase>;
    const marca = await getBlyndtekContentBrand(supabase);
    if (!marca) return NextResponse.json({ error: "Marca Blyndtek not found" }, { status: 404 });
    const plataforma = new URL(request.url).searchParams.get("plataforma") ?? "instagram_feed";
    const { data, error } = await supabase.from("contenido_feed_slots").select("*").eq("marca_id", marca.id).eq("plataforma", plataforma).order("slot_orden", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: error.code === "PGRST205" ? 503 : 500 });
    return NextResponse.json({ data: data ?? [] });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unexpected error" }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  try {
    if (!(await getBrandManagerUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const body = (await request.json()) as Partial<FeedSlotContenido>;
    if (!body.plataforma || typeof body.slot_orden !== "number") return NextResponse.json({ error: "Slot inválido." }, { status: 400 });
    const supabase = createAdminClient() as unknown as SupabaseClient<ContenidoDatabase>;
    const marca = await getBlyndtekContentBrand(supabase);
    if (!marca) return NextResponse.json({ error: "Marca Blyndtek not found" }, { status: 404 });
    const { data, error } = await supabase.from("contenido_feed_slots").upsert({ marca_id: marca.id, plataforma: body.plataforma, slot_orden: body.slot_orden, fecha_programada: body.fecha_programada || null, updated_at: new Date().toISOString() } as never, { onConflict: "marca_id,plataforma,slot_orden" }).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: error.code === "PGRST205" ? 503 : 500 });
    return NextResponse.json({ data });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unexpected error" }, { status: 500 }); }
}
