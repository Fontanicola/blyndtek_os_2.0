import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ChecklistQaItem } from "@/types/checklistQa";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const body = (await request.json()) as { completado?: boolean };
    const supabase = createAdminClient();

    const { data: currentItem, error: currentError } = await supabase
      .from("checklist_qa")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();

    if (currentError || !currentItem) {
      const status = currentError?.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: currentError?.message ?? "No se encontró el ítem." }, { status });
    }

    const completado = typeof body.completado === "boolean" ? body.completado : !currentItem.completado;

    const { data, error } = await supabase
      .from("checklist_qa")
      .update({
        completado,
        completado_por: completado ? currentUser.id : null,
        completado_at: completado ? new Date().toISOString() : null
      })
      .eq("id", params.id)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "No se pudo actualizar el ítem." }, { status: 500 });
    }

    return NextResponse.json({ data: data as ChecklistQaItem });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("checklist_qa").delete().eq("id", params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
