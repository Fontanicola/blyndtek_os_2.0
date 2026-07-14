import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ChecklistQaItem } from "@/types/checklistQa";

type RouteContext = {
  params: {
    id: string;
  };
};

type ChecklistRow = ChecklistQaItem & {
  completado_por_nombre?: string | null;
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: checklist, error } = await supabase
      .from("checklist_qa")
      .select("*")
      .eq("fase_id", params.id)
      .order("orden", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (checklist ?? []) as ChecklistQaItem[];
    const completedUserIds = Array.from(
      new Set(rows.map((item) => item.completado_por).filter((value): value is string => Boolean(value)))
    );

    let userMap = new Map<string, string>();

    if (completedUserIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from("usuarios")
        .select("id, nombre")
        .in("id", completedUserIds);

      if (usersError) {
        return NextResponse.json({ error: usersError.message }, { status: 500 });
      }

      userMap = new Map((users ?? []).map((user) => [user.id, user.nombre]));
    }

    const items = rows.map((item) => ({
      ...item,
      completado_por_nombre: item.completado_por ? userMap.get(item.completado_por) ?? null : null
    })) as ChecklistRow[];

    return NextResponse.json({ data: items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
