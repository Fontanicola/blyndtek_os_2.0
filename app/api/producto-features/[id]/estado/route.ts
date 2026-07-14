import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EstadoFeatureProducto, ProductoFeature } from "@/types/productos";

type RouteContext = {
  params: {
    id: string;
  };
};

const estadosValidos: EstadoFeatureProducto[] = ["idea", "planificado", "en_desarrollo", "lanzado"];

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as { estado?: EstadoFeatureProducto };

    if (!body.estado || !estadosValidos.includes(body.estado)) {
      return NextResponse.json({ error: "estado is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("producto_features")
      .update({ estado: body.estado })
      .eq("id", params.id)
      .select("*")
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ data: data as ProductoFeature });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
