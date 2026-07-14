import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "archivos-blyndtek";

type RouteContext = {
  params: {
    path: string;
  };
};

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const storagePath = decodeURIComponent(params.path);
    const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "No se pudo leer la foto." },
        { status: 404 }
      );
    }

    const arrayBuffer = await data.arrayBuffer();

    return new Response(arrayBuffer, {
      headers: {
        "Content-Type": data.type || "application/octet-stream",
        "Cache-Control": "private, max-age=0, must-revalidate"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
