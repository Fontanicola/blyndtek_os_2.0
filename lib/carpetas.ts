import { createAdminClient } from "@/lib/supabase/admin";
import type { Carpeta, CarpetaContenido, Seccion } from "@/types/archivos";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

type EntityFolder = {
  id: string;
  nombre: string;
};

function selectCarpetaColumns() {
  return "id, nombre, seccion, orden, carpeta_padre_id, cliente_id, proyecto_id, es_automatica, creado_por, created_at";
}

function isEntityFolder(value: Carpeta | null | undefined): value is Carpeta {
  return Boolean(value);
}

async function findFirstCarpetaByEntity(
  supabase: SupabaseAdmin,
  filters: { cliente_id?: string; proyecto_id?: string }
) {
  let query = supabase.from("carpetas").select(selectCarpetaColumns()).limit(1);

  if (filters.cliente_id) {
    query = query.eq("cliente_id", filters.cliente_id);
  }

  if (filters.proyecto_id) {
    query = query.eq("proyecto_id", filters.proyecto_id);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as Carpeta | null;
}

export async function crearCarpetaAutomaticaCliente(supabase: SupabaseAdmin, cliente: EntityFolder) {
  const existing = await findFirstCarpetaByEntity(supabase, { cliente_id: cliente.id });

  if (isEntityFolder(existing)) {
    return existing;
  }

  const { data, error } = await supabase
    .from("carpetas")
    .insert({
      nombre: cliente.nombre,
      seccion: "clientes" satisfies Seccion,
      carpeta_padre_id: null,
      cliente_id: cliente.id,
      proyecto_id: null,
      es_automatica: true,
      creado_por: null
    })
    .select(selectCarpetaColumns())
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as unknown as Carpeta;
}

export async function crearCarpetaAutomaticaProyecto(
  supabase: SupabaseAdmin,
  proyecto: EntityFolder
) {
  const existing = await findFirstCarpetaByEntity(supabase, { proyecto_id: proyecto.id });

  if (isEntityFolder(existing)) {
    return existing;
  }

  const { data, error } = await supabase
    .from("carpetas")
    .insert({
      nombre: proyecto.nombre,
      seccion: "proyectos" satisfies Seccion,
      carpeta_padre_id: null,
      cliente_id: null,
      proyecto_id: proyecto.id,
      es_automatica: true,
      creado_por: null
    })
    .select(selectCarpetaColumns())
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as unknown as Carpeta;
}

export async function getCarpetaById(supabase: SupabaseAdmin, id: string) {
  const { data, error } = await supabase.from("carpetas").select(selectCarpetaColumns()).eq("id", id).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as Carpeta | null) ?? null;
}

export async function getParentChain(
  supabase: SupabaseAdmin,
  carpetaId: string
): Promise<Array<{ id: string; carpeta_padre_id: string | null; seccion: Seccion }>> {
  const chain: Array<{ id: string; carpeta_padre_id: string | null; seccion: Seccion }> = [];
  const visited = new Set<string>();
  let currentId: string | null = carpetaId;

  while (currentId) {
    if (visited.has(currentId)) {
      break;
    }

    visited.add(currentId);
    const response: {
      data: { id: string; carpeta_padre_id: string | null; seccion: Seccion } | null;
      error: { message: string } | null;
    } = await supabase
      .from("carpetas")
      .select("id, carpeta_padre_id, seccion")
      .eq("id", currentId)
      .maybeSingle();
    const { data, error } = response;

    if (error || !data) {
      break;
    }

    chain.push(data as { id: string; carpeta_padre_id: string | null; seccion: Seccion });
    currentId = data.carpeta_padre_id;
  }

  return chain;
}

export async function wouldCreateCarpetaCycle(
  supabase: SupabaseAdmin,
  carpetaId: string,
  nuevaCarpetaPadreId: string
) {
  if (carpetaId === nuevaCarpetaPadreId) {
    return true;
  }

  const ancestorChain = await getParentChain(supabase, nuevaCarpetaPadreId);
  return ancestorChain.some((entry) => entry.id === carpetaId);
}

export async function validateCarpetaParentSection(
  supabase: SupabaseAdmin,
  carpetaId: string,
  nuevaCarpetaPadreId: string | null
) {
  if (!nuevaCarpetaPadreId) {
    return null;
  }

  const carpeta = await getCarpetaById(supabase, carpetaId);
  const parent = await getCarpetaById(supabase, nuevaCarpetaPadreId);

  if (!carpeta || !parent) {
    return "La carpeta destino no existe.";
  }

  if (carpeta.seccion !== parent.seccion) {
    return "No se puede mover una carpeta entre secciones distintas.";
  }

  return null;
}

export async function ensureCarpetaAutomaticaCliente(
  supabase: SupabaseAdmin,
  cliente: EntityFolder
) {
  return crearCarpetaAutomaticaCliente(supabase, cliente);
}

export async function ensureCarpetaAutomaticaProyecto(
  supabase: SupabaseAdmin,
  proyecto: EntityFolder
) {
  return crearCarpetaAutomaticaProyecto(supabase, proyecto);
}

export async function getCarpetaContenido(
  supabase: SupabaseAdmin,
  carpetaId: string
): Promise<CarpetaContenido | null> {
  const carpeta = await getCarpetaById(supabase, carpetaId);

  if (!carpeta) {
    return null;
  }

  const [{ data: subcarpetas, error: subcarpetasError }, { data: archivos, error: archivosError }] =
    await Promise.all([
      supabase
        .from("carpetas")
        .select(selectCarpetaColumns())
        .eq("carpeta_padre_id", carpetaId)
        .order("orden", { ascending: true })
        .order("nombre", { ascending: true }),
      supabase
        .from("archivos")
        .select("id, nombre, carpeta_id, orden, storage_path, tipo_mime, tamanio_bytes, en_papelera, eliminado_at, subido_por, created_at")
        .eq("carpeta_id", carpetaId)
        .eq("en_papelera", false)
        .order("orden", { ascending: true })
        .order("nombre", { ascending: true })
    ]);

  if (subcarpetasError) {
    throw new Error(subcarpetasError.message);
  }

  if (archivosError) {
    throw new Error(archivosError.message);
  }

  return {
    carpeta,
    subcarpetas: (subcarpetas ?? []) as unknown as Carpeta[],
    archivos: (archivos ?? []) as unknown as CarpetaContenido["archivos"]
  };
}

export async function getCarpetasCompartidasIdsParaUsuario(
  supabase: SupabaseAdmin,
  usuarioId: string
) {
  const { data, error } = await supabase
    .from("carpetas_compartidas")
    .select("carpeta_id")
    .eq("usuario_id", usuarioId);

  if (error) {
    throw new Error(error.message);
  }

  return new Set((data ?? []).map((item) => (item as { carpeta_id: string }).carpeta_id));
}

export async function canUsuarioAccederCarpetaCompartida(
  supabase: SupabaseAdmin,
  usuarioId: string,
  carpetaId: string
) {
  const sharedIds = await getCarpetasCompartidasIdsParaUsuario(supabase, usuarioId);

  if (sharedIds.has(carpetaId)) {
    return true;
  }

  const chain = await getParentChain(supabase, carpetaId);
  return chain.some((entry) => sharedIds.has(entry.id));
}

export async function getCarpetasCompartidasParaUsuario(
  supabase: SupabaseAdmin,
  usuarioId: string
): Promise<Carpeta[]> {
  const sharedIds = [...(await getCarpetasCompartidasIdsParaUsuario(supabase, usuarioId))];

  if (sharedIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("carpetas")
    .select(selectCarpetaColumns())
    .in("id", sharedIds)
    .order("orden", { ascending: true })
    .order("nombre", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as Carpeta[];
}
