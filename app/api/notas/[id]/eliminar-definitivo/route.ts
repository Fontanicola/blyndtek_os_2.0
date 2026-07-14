import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const supabase = createAdminClient();
    const { data, error: fetchError } = await supabase
      .from("notas")
      .select("id, en_papelera")
      .eq("id", params.id)
      .single();

    if (fetchError) {
      const status = fetchError.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: fetchError.message }, { status });
    }

    if (!data?.en_papelera) {
      return NextResponse.json({ error: "La nota debe estar en papelera antes de eliminarla." }, { status: 400 });
    }

    const { error } = await supabase.from("notas").delete().eq("id", params.id);

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
