import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrandManagerUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBlyndtekContentBrand } from "@/lib/contenido/blyndtek";
import type { ContenidoDatabase, PilarContenido } from "@/types/contenido";

type RouteContext = {
  params: {
    id: string;
  };
};

async function assertBlyndtekPilar(supabase: SupabaseClient<ContenidoDatabase>, id: string) {
  const marca = await getBlyndtekContentBrand(supabase);

  if (!marca) {
    return { marca: null, pilar: null };
  }

  const { data } = await supabase
    .from("pilares_contenido")
    .select("*")
    .eq("id", id)
    .eq("marca_id", marca.id)
    .maybeSingle();

  return { marca, pilar: (data as PilarContenido | null) ?? null };
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const admin = await getBrandManagerUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient() as unknown as SupabaseClient<ContenidoDatabase>;
    const { pilar } = await assertBlyndtekPilar(supabase, params.id);

    if (!pilar) {
      return NextResponse.json({ error: "Pilar not found" }, { status: 404 });
    }

    const body = (await request.json()) as Partial<Pick<PilarContenido, "nombre" | "descripcion" | "color">>;
    const updatePayload: Partial<PilarContenido> = {};

    if ("nombre" in body) updatePayload.nombre = body.nombre?.trim() || pilar.nombre;
    if ("descripcion" in body) updatePayload.descripcion = body.descripcion?.trim() || null;
    if ("color" in body) updatePayload.color = body.color?.trim() || "signal";

    const { data, error } = await supabase
      .from("pilares_contenido")
      .update(updatePayload as never)
      .eq("id", params.id)
      .select("*")
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

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const admin = await getBrandManagerUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient() as unknown as SupabaseClient<ContenidoDatabase>;
    const { pilar } = await assertBlyndtekPilar(supabase, params.id);

    if (!pilar) {
      return NextResponse.json({ error: "Pilar not found" }, { status: 404 });
    }

    const { error } = await supabase.from("pilares_contenido").delete().eq("id", params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
