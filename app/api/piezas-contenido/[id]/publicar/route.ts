import { NextResponse } from "next/server";
import { getBrandManagerUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBlyndtekContentBrand } from "@/lib/contenido/blyndtek";
import { publishInstagramPiece } from "@/lib/meta/instagram-publishing";
import type { ContenidoDatabase } from "@/types/contenido";
import type { SupabaseClient } from "@supabase/supabase-js";

type Params = { params: { id: string } };
type SocialRow = {
  id: string;
  access_token: string | null;
  cuenta_externa_id: string | null;
};
type PieceRow = Record<string, unknown> & {
  id: string;
  storage_path: string | null;
  plataforma: string;
  caption: string | null;
  titulo: string;
};

async function publishLinkedIn({
  token,
  author,
  pieza,
}: {
  token: string;
  author: string;
  pieza: Record<string, unknown>;
}) {
  const version = process.env.LINKEDIN_VERSION || "202601";
  const response = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": version,
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: author.startsWith("urn:")
        ? author
        : `urn:li:organization:${author}`,
      commentary:
        typeof pieza.caption === "string" ? pieza.caption : pieza.titulo,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });
  const text = await response.text();
  if (!response.ok)
    throw new Error(text || "LinkedIn no pudo publicar el contenido.");
  return response.headers.get("x-restli-id") || JSON.parse(text).id || null;
}

export async function POST(request: Request, { params }: Params) {
  const user = await getBrandManagerUser();
  if (!user)
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as {
    red?: "instagram" | "linkedin";
  };
  if (!body.red)
    return NextResponse.json(
      { error: "Elegí una red para publicar." },
      { status: 400 },
    );

  const supabase =
    createAdminClient() as unknown as SupabaseClient<ContenidoDatabase>;
  const { data: piezaRaw, error: piezaError } = await supabase
    .from("piezas_contenido")
    .select("*")
    .eq("id", params.id)
    .single();
  const pieza = piezaRaw as unknown as PieceRow | null;
  if (piezaError || !pieza)
    return NextResponse.json(
      { error: "No se encontró la pieza." },
      { status: 404 },
    );

  const marca = await getBlyndtekContentBrand(supabase);
  if (!marca)
    return NextResponse.json(
      { error: "No se encontró la marca." },
      { status: 404 },
    );

  if (body.red === "instagram") {
    try {
      await publishInstagramPiece(pieza.id, user.id);
      const { data: updated, error: updateError } = await supabase
        .from("piezas_contenido")
        .select("*")
        .eq("id", pieza.id)
        .single();
      if (updateError)
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 },
        );
      return NextResponse.json({ data: updated });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Instagram rechazó la publicación.",
        },
        { status: 502 },
      );
    }
  }

  const { data: integracionRaw, error: integrationError } = await supabase
    .from("contenido_integraciones_sociales")
    .select("*")
    .eq("marca_id", marca.id)
    .eq("red", body.red)
    .eq("activa", true)
    .maybeSingle();
  const integracion = integracionRaw as unknown as SocialRow | null;
  if (
    integrationError ||
    !integracion?.access_token ||
    !integracion.cuenta_externa_id
  ) {
    return NextResponse.json(
      { error: "Conectá la cuenta de LinkedIn con OAuth antes de publicar." },
      { status: 409 },
    );
  }

  let externalId: string | null = null;
  try {
    externalId = await publishLinkedIn({
      token: integracion.access_token,
      author: integracion.cuenta_externa_id,
      pieza,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "La red rechazó la publicación.";
    await supabase
      .from("contenido_publicaciones_log")
      .insert({
        pieza_id: pieza.id,
        integracion_id: integracion.id,
        red: body.red,
        estado: "fallido",
        error: message,
        creado_por: user.id,
      } as never);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  await supabase
    .from("contenido_publicaciones_log")
    .insert({
      pieza_id: pieza.id,
      integracion_id: integracion.id,
      red: body.red,
      estado: "publicado",
      id_externo: externalId,
      publicado_at: new Date().toISOString(),
      creado_por: user.id,
    } as never);
  const { data: updated, error: updateError } = await supabase
    .from("piezas_contenido")
    .update({
      estado: "publicada",
      publicado_at: new Date().toISOString(),
      meta_post_id: externalId,
    } as never)
    .eq("id", pieza.id)
    .select("*")
    .single();
  if (updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json({ data: updated });
}
