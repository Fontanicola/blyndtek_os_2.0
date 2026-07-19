import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "archivos-blyndtek";

type RouteContext = {
  params: {
    token: string;
  };
};

type ProjectImageRecord = {
  imagen_sistema_storage_path: string | null;
};

async function findProjectByToken(supabase: ReturnType<typeof createAdminClient>, token: string) {
  const select = "imagen_sistema_storage_path";

  const bySlug = await supabase
    .from("proyectos")
    .select(select)
    .eq("roadmap_slug", token)
    .eq("roadmap_publico_activo", true)
    .maybeSingle<ProjectImageRecord>();

  if (bySlug.data) {
    return bySlug.data;
  }

  const byToken = await supabase
    .from("proyectos")
    .select(select)
    .eq("roadmap_token", token)
    .eq("roadmap_publico_activo", true)
    .maybeSingle<ProjectImageRecord>();

  return byToken.data ?? null;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const token = params.token.trim();

    if (!token) {
      return new NextResponse("Not found", { status: 404 });
    }

    const supabase = createAdminClient();
    const project = await findProjectByToken(supabase, token);

    if (!project?.imagen_sistema_storage_path) {
      return new NextResponse("Not found", { status: 404 });
    }

    const { data, error } = await supabase.storage.from(BUCKET).download(project.imagen_sistema_storage_path);

    if (error || !data) {
      return new NextResponse("Not found", { status: 404 });
    }

    const headers = new Headers();
    headers.set("Content-Type", data.type || "application/octet-stream");
    headers.set("Cache-Control", "no-store");

    return new NextResponse(data, { headers });
  } catch {
    return new NextResponse("Unexpected error", { status: 500 });
  }
}
