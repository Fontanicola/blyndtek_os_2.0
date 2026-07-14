import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildCajaSlug, CAJA_COLOR_OPTIONS } from "@/lib/cajas";
import type { Caja } from "@/types/cajas";

type CreateCajaBody = {
  nombre?: string;
  color?: string;
};

type CajaRow = Caja;

function isValidColor(color: string | undefined): color is string {
  return Boolean(color && CAJA_COLOR_OPTIONS.includes(color as (typeof CAJA_COLOR_OPTIONS)[number]));
}

async function resolveUniqueSlug(supabase: ReturnType<typeof createAdminClient>, nombre: string) {
  const baseSlug = buildCajaSlug(nombre);
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const { data, error } = await supabase.from("cajas").select("id").eq("slug", candidate).maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return candidate;
    }

    candidate = `${baseSlug}_${suffix}`;
    suffix += 1;
  }
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const activaParam = request.nextUrl.searchParams.get("activa");
    let query = supabase.from("cajas").select("*").order("orden", { ascending: true });

    if (activaParam === "true") {
      query = query.eq("activa", true);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: (data ?? []) as CajaRow[] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as CreateCajaBody;
    const nombre = body.nombre?.trim() ?? "";
    const color = body.color?.trim() ?? "";

    if (!nombre) {
      return NextResponse.json({ error: "nombre is required" }, { status: 400 });
    }

    if (!isValidColor(color)) {
      return NextResponse.json({ error: "color is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const slug = await resolveUniqueSlug(supabase, nombre);
    const { data: lastCaja } = await supabase.from("cajas").select("orden").order("orden", { ascending: false }).limit(1);
    const nextOrden = Number(lastCaja?.[0]?.orden ?? 0) + 1;

    const { data, error } = await supabase
      .from("cajas")
      .insert({
        nombre,
        slug,
        color,
        activa: true,
        orden: nextOrden
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data as CajaRow }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
