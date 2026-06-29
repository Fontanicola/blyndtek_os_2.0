import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ConfigFinanzas } from "@/types/finanzas";

function defaultConfig(): ConfigFinanzas {
  return {
    id: crypto.randomUUID(),
    caja_inicial: 0,
    updated_at: new Date().toISOString()
  };
}

export async function GET() {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("config_finanzas")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: (data?.[0] ?? defaultConfig()) as ConfigFinanzas });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as { caja_inicial?: number };
    if (typeof body.caja_inicial !== "number" || Number.isNaN(body.caja_inicial)) {
      return NextResponse.json({ error: "caja_inicial must be a valid number" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: existingRows, error: readError } = await supabase
      .from("config_finanzas")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1);

    if (readError) {
      return NextResponse.json({ error: readError.message }, { status: 500 });
    }

    const existing = existingRows?.[0];

    if (!existing) {
      const { data, error } = await supabase
        .from("config_finanzas")
        .insert({
          id: crypto.randomUUID(),
          caja_inicial: body.caja_inicial,
          updated_at: new Date().toISOString()
        })
        .select("*")
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ data: data as ConfigFinanzas });
    }

    const { data, error } = await supabase
      .from("config_finanzas")
      .update({
        caja_inicial: body.caja_inicial,
        updated_at: new Date().toISOString()
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data as ConfigFinanzas });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
