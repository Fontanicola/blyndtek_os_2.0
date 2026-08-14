import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Cliente, UpdateClienteInput } from "@/types/clientes";

const CLIENT_FILES_BUCKET = "archivos-blyndtek";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    if (currentUser.rol === "comercial" && data?.vendedor_id !== currentUser.id) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    if (currentUser.rol !== "admin" && currentUser.rol !== "comercial") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    return NextResponse.json({ data: data as Cliente });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const body = (await request.json()) as UpdateClienteInput;
    const supabase = createAdminClient();
    const { data: existingCliente, error: existingClienteError } = await supabase
      .from("clientes")
      .select("id, vendedor_id")
      .eq("id", params.id)
      .single();

    if (existingClienteError) {
      const status = existingClienteError.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: existingClienteError.message }, { status });
    }

    if (currentUser.rol === "comercial" && existingCliente?.vendedor_id !== currentUser.id) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    if (currentUser.rol !== "admin" && currentUser.rol !== "comercial") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("clientes")
      .update(body)
      .eq("id", params.id)
      .select("*")
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ data: data as Cliente });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    if (currentUser.rol !== "admin") {
      return NextResponse.json({ error: "Sólo un administrador puede eliminar clientes." }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { data: existingCliente, error: existingClienteError } = await supabase
      .from("clientes")
      .select("id")
      .eq("id", params.id)
      .single();

    if (existingClienteError) {
      const status = existingClienteError.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: existingClienteError.message }, { status });
    }

    const [{ data: projects, error: projectsError }, { data: folders, error: foldersError }] = await Promise.all([
      supabase.from("proyectos").select("id, imagen_sistema_storage_path").eq("cliente_id", params.id),
      supabase.from("carpetas").select("id, carpeta_padre_id, cliente_id, proyecto_id")
    ]);

    if (projectsError || foldersError) {
      return NextResponse.json({ error: projectsError?.message ?? foldersError?.message ?? "No se pudo preparar la eliminación." }, { status: 500 });
    }

    const projectIds = new Set((projects ?? []).map((project) => project.id));
    const folderIds = new Set(
      (folders ?? [])
        .filter((folder) => folder.cliente_id === params.id || (folder.proyecto_id ? projectIds.has(folder.proyecto_id) : false))
        .map((folder) => folder.id)
    );
    let expanded = true;
    while (expanded) {
      expanded = false;
      for (const folder of folders ?? []) {
        if (folder.carpeta_padre_id && folderIds.has(folder.carpeta_padre_id) && !folderIds.has(folder.id)) {
          folderIds.add(folder.id);
          expanded = true;
        }
      }
    }

    const storagePaths = new Set<string>();
    for (const project of projects ?? []) {
      if (project.imagen_sistema_storage_path) storagePaths.add(project.imagen_sistema_storage_path);
    }

    if (folderIds.size > 0) {
      const { data: files, error: filesError } = await supabase
        .from("archivos")
        .select("storage_path")
        .in("carpeta_id", [...folderIds]);
      if (filesError) return NextResponse.json({ error: filesError.message }, { status: 500 });
      for (const file of files ?? []) {
        if (file.storage_path) storagePaths.add(file.storage_path);
      }
    }

    const { error: deleteError } = await supabase.rpc("eliminar_cliente_completo", { target_cliente_id: params.id } as never);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    if (storagePaths.size > 0) {
      const { error: storageError } = await supabase.storage.from(CLIENT_FILES_BUCKET).remove([...storagePaths]);
      if (storageError) {
        console.error("No se pudieron eliminar todos los archivos del cliente", { clienteId: params.id, storageError });
      }
    }

    return NextResponse.json({ success: true, deletedClienteId: existingCliente.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
