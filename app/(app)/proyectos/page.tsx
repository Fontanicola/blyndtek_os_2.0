import { ProyectosClient } from "@/components/proyectos";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Cliente } from "@/types/clientes";
import type { Cotizacion } from "@/types/cotizaciones";
import type { Usuario } from "@/types/auth";

export const dynamic = "force-dynamic";

export default async function ProyectosPage() {
  const usuario = await getCurrentUser();
  const supabase = createAdminClient();

  const [{ data: clientesData }, { data: cotizacionesData }, { data: usuariosData }] =
    await Promise.all([
      supabase.from("clientes").select("id, empresa, estado").order("empresa", { ascending: true }),
      supabase
        .from("cotizaciones")
        .select("id, empresa, precio_total")
        .order("created_at", { ascending: false }),
      supabase
        .from("usuarios")
        .select("id, nombre, email, rol")
        .eq("activo", true)
        .order("nombre", { ascending: true })
    ]);

  const clientes = (clientesData ?? []) as Array<Pick<Cliente, "id" | "empresa" | "estado">>;
  const cotizaciones = (cotizacionesData ?? []) as Array<Pick<Cotizacion, "id" | "empresa" | "precio_total">>;
  const usuarios = (usuariosData ?? []) as Array<Pick<Usuario, "id" | "nombre" | "email" | "rol">>;

  return <ProyectosClient usuario={usuario} clientes={clientes} cotizaciones={cotizaciones} usuarios={usuarios} />;
}
