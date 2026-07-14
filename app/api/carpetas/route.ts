import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCarpetaById } from "@/lib/carpetas";
import type { Carpeta, CarpetaConConteos, Seccion } from "@/types/archivos";

function parseSeccion(value: string | null): Seccion | null {
  if (
    value === "clientes" ||
    value === "proyectos" ||
    value === "comercial" ||
    value === "finanzas" ||
    value === "general"
  ) {
    return value;
  }

  return null;
}

async function getNextOrdenForCarpetas(
  supabase: ReturnType<typeof createAdminClient>,
  seccion: Seccion,
  carpetaPadreId: string | null
) {
  const folderQuery = supabase.from("carpetas").select("orden").eq("seccion", seccion);
  const fileQuery = supabase.from("archivos").select("orden");

  const [foldersResult, filesResult] = (await Promise.all([
    (carpetaPadreId ? folderQuery.eq("carpeta_padre_id", carpetaPadreId) : folderQuery.is("carpeta_padre_id", null))
      .order("orden", { ascending: false })
      .limit(1),
    (carpetaPadreId ? fileQuery.eq("carpeta_id", carpetaPadreId) : fileQuery.is("carpeta_id", null))
      .eq("en_papelera", false)
      .order("orden", { ascending: false })
      .limit(1)
  ])) as unknown as [
    { data: Array<{ orden: number }> | null; error: { message: string } | null },
    { data: Array<{ orden: number }> | null; error: { message: string } | null }
  ];

  const { data: folderData, error: folderError } = foldersResult;
  const { data: fileData, error: fileError } = filesResult;

  if (folderError) {
    throw new Error(folderError.message);
  }

  if (fileError) {
    throw new Error(fileError.message);
  }

  return Math.max(Number(folderData?.[0]?.orden ?? 0), Number(fileData?.[0]?.orden ?? 0)) + 1;
}

async function buildConteos(
  supabase: ReturnType<typeof createAdminClient>,
  carpetas: Carpeta[]
): Promise<CarpetaConConteos[]> {
  const folderIds = carpetas.map((carpeta) => carpeta.id);

  if (folderIds.length === 0) {
    return [];
  }

  const [{ data: subcarpetas }, { data: archivos }] = await Promise.all([
    supabase
      .from("carpetas")
      .select("id, carpeta_padre_id")
      .in("carpeta_padre_id", folderIds),
    supabase
      .from("archivos")
      .select("id, carpeta_id")
      .eq("en_papelera", false)
      .in("carpeta_id", folderIds)
  ]);

  const subcarpetasMap = new Map<string, number>();
  const archivosMap = new Map<string, number>();

  for (const item of subcarpetas ?? []) {
    const carpetaPadreId = (item as { carpeta_padre_id: string | null }).carpeta_padre_id;

    if (!carpetaPadreId) {
      continue;
    }

    subcarpetasMap.set(carpetaPadreId, (subcarpetasMap.get(carpetaPadreId) ?? 0) + 1);
  }

  for (const item of archivos ?? []) {
    const carpetaId = (item as { carpeta_id: string | null }).carpeta_id;

    if (!carpetaId) {
      continue;
    }

    archivosMap.set(carpetaId, (archivosMap.get(carpetaId) ?? 0) + 1);
  }

  return carpetas.map((carpeta) => ({
    ...carpeta,
    subcarpetas_count: subcarpetasMap.get(carpeta.id) ?? 0,
    archivos_count: archivosMap.get(carpeta.id) ?? 0
  }));
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminUser();

    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const seccion = parseSeccion(request.nextUrl.searchParams.get("seccion"));
    const carpetaPadreId = request.nextUrl.searchParams.get("carpeta_padre_id")?.trim() || null;

    if (!seccion) {
      return NextResponse.json({ error: "seccion is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    let query = supabase
      .from("carpetas")
      .select("id, nombre, seccion, orden, carpeta_padre_id, cliente_id, proyecto_id, es_automatica, creado_por, created_at")
      .eq("seccion", seccion);

    if (carpetaPadreId) {
      query = query.eq("carpeta_padre_id", carpetaPadreId);
    } else {
      query = query.is("carpeta_padre_id", null);
    }

    const { data, error } = await query.order("orden", { ascending: true }).order("nombre", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const carpetas = (data ?? []) as unknown as Carpeta[];
    const carpetasConConteos = await buildConteos(supabase, carpetas);

    return NextResponse.json({ data: carpetasConConteos });
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

    const body = (await request.json()) as Partial<{
      nombre: string;
      seccion: Seccion;
      carpeta_padre_id: string | null;
    }>;

    const nombre = body.nombre?.trim() ?? "";
    const seccion = parseSeccion(body.seccion ?? null);
    const carpetaPadreId = body.carpeta_padre_id?.trim() || null;

    if (!nombre) {
      return NextResponse.json({ error: "nombre is required" }, { status: 400 });
    }

    if (!seccion) {
      return NextResponse.json({ error: "seccion is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    if (carpetaPadreId) {
      const parent = await getCarpetaById(supabase, carpetaPadreId);

      if (!parent) {
        return NextResponse.json({ error: "La carpeta padre no existe." }, { status: 404 });
      }

      if (parent.seccion !== seccion) {
        return NextResponse.json(
          { error: "No se puede crear una carpeta fuera de su sección." },
          { status: 400 }
        );
      }
    }

    const nextOrden = await getNextOrdenForCarpetas(supabase, seccion, carpetaPadreId);

    const { data, error } = await supabase
      .from("carpetas")
      .insert({
        nombre,
        seccion,
        orden: nextOrden,
        carpeta_padre_id: carpetaPadreId,
        cliente_id: null,
        proyecto_id: null,
        es_automatica: false,
        creado_por: admin.id
      } as never)
      .select("id, nombre, seccion, orden, carpeta_padre_id, cliente_id, proyecto_id, es_automatica, creado_por, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data as unknown as Carpeta }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
