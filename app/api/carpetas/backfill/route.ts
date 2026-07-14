import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ensureCarpetaAutomaticaCliente,
  ensureCarpetaAutomaticaProyecto
} from "@/lib/carpetas";

export async function POST() {
  try {
    const admin = await getAdminUser();

    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const [{ data: clientes, error: clientesError }, { data: proyectos, error: proyectosError }] =
      await Promise.all([
        supabase.from("clientes").select("id, empresa"),
        supabase.from("proyectos").select("id, nombre")
      ]);

    if (clientesError) {
      return NextResponse.json({ error: clientesError.message }, { status: 500 });
    }

    if (proyectosError) {
      return NextResponse.json({ error: proyectosError.message }, { status: 500 });
    }

    const createdClientes: string[] = [];
    const createdProyectos: string[] = [];
    const skipped: string[] = [];

    for (const cliente of (clientes ?? []) as Array<{ id: string; empresa: string }>) {
      const { data: carpetaExistente } = await supabase
        .from("carpetas")
        .select("id")
        .eq("cliente_id", cliente.id)
        .limit(1)
        .maybeSingle();

      if (carpetaExistente) {
        continue;
      }

      try {
        const carpeta = await ensureCarpetaAutomaticaCliente(supabase, {
          id: cliente.id,
          nombre: cliente.empresa
        });

        if (carpeta) {
          createdClientes.push(cliente.id);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected folder error";
        skipped.push(`cliente:${cliente.id}:${message}`);
      }
    }

    for (const proyecto of (proyectos ?? []) as Array<{ id: string; nombre: string }>) {
      const { data: carpetaExistente } = await supabase
        .from("carpetas")
        .select("id")
        .eq("proyecto_id", proyecto.id)
        .limit(1)
        .maybeSingle();

      if (carpetaExistente) {
        continue;
      }

      try {
        const carpeta = await ensureCarpetaAutomaticaProyecto(supabase, {
          id: proyecto.id,
          nombre: proyecto.nombre
        });

        if (carpeta) {
          createdProyectos.push(proyecto.id);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected folder error";
        skipped.push(`proyecto:${proyecto.id}:${message}`);
      }
    }

    return NextResponse.json({
      data: {
        createdClientes,
        createdProyectos,
        skipped,
        updated: createdClientes.length + createdProyectos.length
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
