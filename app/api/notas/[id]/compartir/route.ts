import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Usuario } from "@/types/auth";
import type { Database } from "@/types/supabase";

type RouteContext = {
  params: {
    id: string;
  };
};

type SharePayload = {
  usuario_ids?: string[];
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    if (currentUser.rol !== "admin") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("notas_compartidas")
      .select("usuario_id")
      .eq("nota_id", params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: [...new Set((data ?? []).map((row) => row.usuario_id))] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    if (currentUser.rol !== "admin") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const body = (await request.json()) as SharePayload;
    const userIds = [...new Set((body.usuario_ids ?? []).filter((value): value is string => typeof value === "string"))];
    const supabase = createAdminClient();

    const { error: deleteError } = await supabase.from("notas_compartidas").delete().eq("nota_id", params.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    if (userIds.length > 0) {
      const { data: usuariosValidos, error: usuariosError } = await supabase
        .from("usuarios")
        .select("id")
        .eq("rol", "comercial")
        .in("id", userIds);

      if (usuariosError) {
        return NextResponse.json({ error: usuariosError.message }, { status: 500 });
      }

      const validIds = new Set((usuariosValidos ?? []).map((usuario: Pick<Usuario, "id">) => usuario.id));
      const rows = [...validIds].map((usuarioId) => ({
        nota_id: params.id,
        usuario_id: usuarioId,
        compartida_por: currentUser.id
      }));

      if (rows.length > 0) {
        const { error: insertError } = await supabase.from("notas_compartidas").insert(rows as Database["public"]["Tables"]["notas_compartidas"]["Insert"][]);

        if (insertError) {
          return NextResponse.json({ error: insertError.message }, { status: 500 });
        }
      }
    }

    const { data } = await supabase.from("notas_compartidas").select("usuario_id").eq("nota_id", params.id);

    return NextResponse.json({
      data: [...new Set((data ?? []).map((row) => row.usuario_id))]
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
