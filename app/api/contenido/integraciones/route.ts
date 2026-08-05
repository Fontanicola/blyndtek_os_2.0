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
    .from("contenido_integraciones_sociales")
    .select("id,marca_id,red,nombre_cuenta,cuenta_externa_id,token_expires_at,activa,metadata,created_at,updated_at")
    .eq("marca_id", marca.id)
    .order("red", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: Request) {
  const user = await getBrandManagerUser();
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const body = (await request.json()) as {
    red?: "instagram" | "linkedin";
    nombre_cuenta?: string;
    cuenta_externa_id?: string | null;
  };
  if (!body.red || !body.nombre_cuenta?.trim()) return NextResponse.json({ error: "Indicá la red y el nombre de la cuenta." }, { status: 400 });
  const supabase = createAdminClient() as unknown as SupabaseClient<ContenidoDatabase>;
  const marca = await getBlyndtekContentBrand(supabase);
  if (!marca) return NextResponse.json({ error: "No se encontró la marca." }, { status: 404 });
  const { data, error } = await supabase
    .from("contenido_integraciones_sociales")
    .upsert({ marca_id: marca.id, red: body.red, nombre_cuenta: body.nombre_cuenta.trim(), cuenta_externa_id: body.cuenta_externa_id ?? null } as never, { onConflict: "marca_id,red,cuenta_externa_id" })
    .select("id,marca_id,red,nombre_cuenta,cuenta_externa_id,token_expires_at,activa,metadata,created_at,updated_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
