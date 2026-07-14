import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PublicRoadmapCredentials } from "@/types/roadmap-public";

type RouteContext = {
  params: {
    token: string;
  };
};

type ProjectRecord = {
  id: string;
  roadmap_slug: string | null;
  roadmap_token: string;
  roadmap_pin: string | null;
  credenciales_cliente: PublicRoadmapCredentials | null;
  roadmap_publico_activo: boolean;
};

async function findProject(token: string) {
  const supabase = createAdminClient();
  const select = "id, roadmap_slug, roadmap_token, roadmap_pin, credenciales_cliente, roadmap_publico_activo";

  const bySlug = await supabase
    .from("proyectos")
    .select(select)
    .eq("roadmap_slug", token)
    .eq("roadmap_publico_activo", true)
    .maybeSingle<ProjectRecord>();

  if (bySlug.data) {
    return bySlug.data;
  }

  const byToken = await supabase
    .from("proyectos")
    .select(select)
    .eq("roadmap_token", token)
    .eq("roadmap_publico_activo", true)
    .maybeSingle<ProjectRecord>();

  return byToken.data ?? null;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const body = (await request.json()) as { pin?: string };
    const pin = body.pin?.trim() ?? "";

    if (!pin) {
      return NextResponse.json({ error: "PIN incorrecto o no disponible" }, { status: 403 });
    }

    const project = await findProject(params.token.trim());

    if (!project || !project.roadmap_pin || project.roadmap_pin.trim() !== pin) {
      return NextResponse.json({ error: "PIN incorrecto o no disponible" }, { status: 403 });
    }

    return NextResponse.json({
      data: project.credenciales_cliente ?? null
    });
  } catch {
    return NextResponse.json({ error: "PIN incorrecto o no disponible" }, { status: 403 });
  }
}
