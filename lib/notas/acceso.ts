import type { SupabaseClient } from "@supabase/supabase-js";
import type { Usuario } from "@/types/auth";
import type { Nota } from "@/types/notas";
import type { Database } from "@/types/supabase";

export async function fetchNotaCompartidaUsuarioIds(
  supabase: SupabaseClient<Database>,
  notaId: string
): Promise<string[]> {
  const { data, error } = await supabase.from("notas_compartidas").select("usuario_id").eq("nota_id", notaId);

  if (error) {
    throw new Error(error.message);
  }

  return [...new Set((data ?? []).map((row) => row.usuario_id))];
}

export async function fetchNotasCompartidasNotaIds(
  supabase: SupabaseClient<Database>,
  usuarioId: string
): Promise<string[]> {
  const { data, error } = await supabase.from("notas_compartidas").select("nota_id").eq("usuario_id", usuarioId);

  if (error) {
    throw new Error(error.message);
  }

  return [...new Set((data ?? []).map((row) => row.nota_id))];
}

export async function canUsuarioAccederNota(
  supabase: SupabaseClient<Database>,
  nota: Pick<Nota, "id" | "creado_por">,
  usuario: Usuario
): Promise<boolean> {
  if (usuario.rol === "admin" || usuario.rol === "miembro") {
    return true;
  }

  if (nota.creado_por === usuario.id) {
    return true;
  }

  const sharedIds = await fetchNotaCompartidaUsuarioIds(supabase, nota.id);
  return sharedIds.includes(usuario.id);
}
