import { createAdminClient } from "@/lib/supabase/admin";
import type { Proyecto } from "@/types/proyectos";
import type { Usuario } from "@/types/auth";

export type TaskProjectOption = Pick<Proyecto, "id" | "nombre" | "estado" | "cliente_id"> & {
  cliente_nombre: string | null;
};
export type TaskUserOption = Pick<Usuario, "id" | "nombre" | "email" | "rol">;

export async function getTaskSupportData() {
  try {
    const supabase = createAdminClient();

    const [{ data: projectsData }, { data: clientsData }, { data: usersData }] = await Promise.all([
      supabase
        .from("proyectos")
        .select("id, nombre, estado, cliente_id")
        .neq("estado", "entregado")
        .neq("estado", "pausado")
        .order("nombre", { ascending: true }),
      supabase.from("clientes").select("id, empresa"),
      supabase
        .from("usuarios")
        .select("id, nombre, email, rol")
        .eq("activo", true)
        .order("nombre", { ascending: true })
    ]);

    const clientNameById = new Map((clientsData ?? []).map((client) => [client.id, client.empresa]));

    return {
      proyectos: (projectsData ?? []).map((project) => ({
        ...project,
        cliente_nombre: clientNameById.get(project.cliente_id) ?? null
      })) as TaskProjectOption[],
      usuarios: (usersData ?? []) as TaskUserOption[]
    };
  } catch {
    return {
      proyectos: [],
      usuarios: []
    };
  }
}
