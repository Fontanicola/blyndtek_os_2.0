import { createAdminClient } from "@/lib/supabase/admin";
import type { Proyecto } from "@/types/proyectos";
import type { Usuario } from "@/types/auth";

export type TaskProjectOption = Pick<Proyecto, "id" | "nombre" | "estado">;
export type TaskUserOption = Pick<Usuario, "id" | "nombre" | "email" | "rol">;

export async function getTaskSupportData() {
  try {
    const supabase = createAdminClient();

    const [{ data: projectsData }, { data: usersData }] = await Promise.all([
      supabase
        .from("proyectos")
        .select("id, nombre, estado")
        .neq("estado", "entregado")
        .neq("estado", "pausado")
        .order("nombre", { ascending: true }),
      supabase
        .from("usuarios")
        .select("id, nombre, email, rol")
        .eq("activo", true)
        .order("nombre", { ascending: true })
    ]);

    return {
      proyectos: (projectsData ?? []) as TaskProjectOption[],
      usuarios: (usersData ?? []) as TaskUserOption[]
    };
  } catch {
    return {
      proyectos: [],
      usuarios: []
    };
  }
}
