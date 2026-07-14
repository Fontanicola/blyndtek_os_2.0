import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ChecklistQaItem } from "@/types/checklistQa";

function normalizeItem(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const body = (await request.json()) as { fase_id?: unknown; item?: unknown };
    const faseId = typeof body.fase_id === "string" ? body.fase_id.trim() : "";
    const item = normalizeItem(body.item);

    if (!faseId) {
      return NextResponse.json({ error: "fase_id is required" }, { status: 400 });
    }

    if (!item) {
      return NextResponse.json({ error: "item is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: lastItem, error: lastItemError } = await supabase
      .from("checklist_qa")
      .select("orden")
      .eq("fase_id", faseId)
      .order("orden", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastItemError) {
      return NextResponse.json({ error: lastItemError.message }, { status: 500 });
    }

    const { data, error } = await supabase
      .from("checklist_qa")
      .insert({
        fase_id: faseId,
        item,
        completado: false,
        completado_por: null,
        completado_at: null,
        orden: (lastItem?.orden ?? -1) + 1,
        generado_por_ia: false
      })
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "No se pudo crear el ítem." }, { status: 500 });
    }

    return NextResponse.json({ data: data as ChecklistQaItem }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
