import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { generarSlugRoadmap } from "@/lib/proyectos/generarSlug";

type ProjectRecord = {
  id: string;
  cliente_id: string;
  roadmap_slug: string | null;
};

async function generateUniqueRoadmapSlug(
  supabase: ReturnType<typeof createAdminClient>,
  nombreCliente: string,
  projectId: string
) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = generarSlugRoadmap(nombreCliente);
    const { data: existingSlug, error: slugError } = await supabase
      .from("proyectos")
      .select("id")
      .eq("roadmap_slug", candidate)
      .neq("id", projectId)
      .maybeSingle();

    if (slugError) {
      throw new Error(slugError.message);
    }

    if (!existingSlug) {
      return candidate;
    }
  }

  throw new Error("No se pudo generar un slug único para el roadmap.");
}

export async function POST() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.rol !== "admin") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { data: projects, error: projectsError } = await supabase
      .from("proyectos")
      .select("id, cliente_id, roadmap_slug")
      .is("roadmap_slug", null);

    if (projectsError) {
      return NextResponse.json({ error: projectsError.message }, { status: 500 });
    }

    const pendingProjects = (projects ?? []) as ProjectRecord[];

    if (pendingProjects.length === 0) {
      return NextResponse.json({ data: { updated: 0 } });
    }

    const clientIds = [...new Set(pendingProjects.map((project) => project.cliente_id))];
    const { data: clients, error: clientsError } = await supabase
      .from("clientes")
      .select("id, empresa")
      .in("id", clientIds);

    if (clientsError) {
      return NextResponse.json({ error: clientsError.message }, { status: 500 });
    }

    const clientMap = new Map((clients ?? []).map((client) => [client.id, client.empresa] as const));
    const updatedProjects: Array<{ id: string; roadmap_slug: string }> = [];

    for (const project of pendingProjects) {
      const clientName = clientMap.get(project.cliente_id);

      if (!clientName) {
        continue;
      }

      const roadmapSlug = await generateUniqueRoadmapSlug(supabase, clientName, project.id);
      const { error: updateError } = await supabase
        .from("proyectos")
        .update({ roadmap_slug: roadmapSlug })
        .eq("id", project.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      updatedProjects.push({ id: project.id, roadmap_slug: roadmapSlug });
    }

    return NextResponse.json({ data: { updated: updatedProjects.length, projects: updatedProjects } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
