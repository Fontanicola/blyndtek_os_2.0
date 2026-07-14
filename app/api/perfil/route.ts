import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const body = (await request.json()) as { nombre?: string };
    const nombre = body.nombre?.trim() ?? "";

    if (!nombre) {
      return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("usuarios")
      .update({ nombre })
      .eq("id", currentUser.id)
      .select("id, nombre, email, rol, google_calendar_token, foto_url, activo, created_at")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "No se pudo actualizar el perfil." },
        { status: 400 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
