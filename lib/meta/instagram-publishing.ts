import { CONTENT_BUCKET } from "@/lib/contenido/blyndtek";
import { getMetaConfig } from "@/lib/meta/config";
import { getMetaGrantedPermissions } from "@/lib/meta/client";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

type Piece = Record<string, unknown> & {
  id: string;
  titulo: string;
  plataforma: string;
  storage_path: string | null;
  imagenes_generadas: string[] | null;
  caption: string | null;
  hashtags: string[] | null;
  estado: string;
  meta_post_id: string | null;
  publication_attempts?: number;
};

type GraphPayload = Record<string, unknown> & {
  id?: string;
  permalink?: string;
  error?: { message?: string; code?: number; error_subcode?: number };
};

async function graph(
  path: string,
  init?: RequestInit,
  params: Record<string, string> = {},
) {
  const config = getMetaConfig();
  if (!config.configured) throw new Error("Meta no está configurado.");
  const url = new URL(
    `https://graph.facebook.com/${config.graphApiVersion}/${path}`,
  );
  Object.entries(params).forEach(([key, value]) =>
    url.searchParams.set(key, value),
  );
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const payload = (await response.json()) as GraphPayload;
  if (!response.ok || payload.error) {
    const suffix = payload.error?.code
      ? ` (${payload.error.code}${payload.error.error_subcode ? `/${payload.error.error_subcode}` : ""})`
      : "";
    throw new Error(
      `${payload.error?.message || `Instagram respondió ${response.status}`}${suffix}`,
    );
  }
  return payload;
}

async function createContainer(
  accountId: string,
  values: Record<string, string>,
) {
  const body = new URLSearchParams(values);
  const payload = await graph(`${accountId}/media`, { method: "POST", body });
  if (!payload.id)
    throw new Error("Instagram no devolvió el contenedor de publicación.");
  return payload.id;
}

async function publishContainer(accountId: string, creationId: string) {
  const payload = await graph(`${accountId}/media_publish`, {
    method: "POST",
    body: new URLSearchParams({ creation_id: creationId }),
  });
  if (!payload.id)
    throw new Error("Instagram no devolvió el identificador publicado.");
  return payload.id;
}

function fullCaption(piece: Piece) {
  const tags = Array.isArray(piece.hashtags)
    ? piece.hashtags.filter(Boolean).join(" ")
    : "";
  return [piece.caption?.trim(), tags]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 2200);
}

function piecePaths(piece: Piece) {
  const generated = Array.isArray(piece.imagenes_generadas)
    ? piece.imagenes_generadas.filter(Boolean).slice(0, 10)
    : [];
  return generated.length
    ? generated
    : piece.storage_path
      ? [piece.storage_path]
      : [];
}

export async function getInstagramPublishingCapability() {
  const config = getMetaConfig();
  if (!config.configured || !config.instagramAccountId) {
    return {
      connected: false,
      canPublish: false,
      missingPermissions: ["instagram_content_publish"],
      accountId: null,
    };
  }
  const permissions = await getMetaGrantedPermissions();
  const missingPermissions = [
    "instagram_basic",
    "instagram_content_publish",
  ].filter((permission) => !permissions.includes(permission));
  return {
    connected: true,
    canPublish: missingPermissions.length === 0,
    missingPermissions,
    accountId: config.instagramAccountId,
  };
}

export async function publishInstagramPiece(
  pieceId: string,
  createdBy: string | null = null,
) {
  const db = createUntypedAdminClient();
  const config = getMetaConfig();
  if (!config.configured || !config.instagramAccountId)
    throw new Error("Falta la cuenta profesional de Instagram.");
  const capability = await getInstagramPublishingCapability();
  if (!capability.canPublish)
    throw new Error(
      `Faltan permisos de publicación: ${capability.missingPermissions.join(", ")}.`,
    );

  const { data: piece, error } = await db
    .from("piezas_contenido")
    .select("*")
    .eq("id", pieceId)
    .maybeSingle();
  if (error) throw error;
  if (!piece) throw new Error("No se encontró la pieza.");
  const typedPiece = piece as Piece;
  if (typedPiece.meta_post_id || typedPiece.estado === "publicada") {
    return {
      id: typedPiece.meta_post_id,
      permalink: piece.published_permalink || null,
      alreadyPublished: true,
    };
  }
  if (
    !["instagram_feed", "instagram_story", "instagram_reel"].includes(
      typedPiece.plataforma,
    )
  ) {
    throw new Error(
      "La pieza no pertenece a un canal publicable de Instagram.",
    );
  }
  const paths = piecePaths(typedPiece);
  if (!paths.length)
    throw new Error(
      "La pieza necesita una imagen renderizada antes de publicarse.",
    );
  if (typedPiece.plataforma === "instagram_reel")
    throw new Error(
      "La pieza necesita un archivo de video para publicarse como Reel.",
    );

  const signedUrls: string[] = [];
  for (const path of typedPiece.plataforma === "instagram_story"
    ? paths.slice(0, 1)
    : paths) {
    const { data, error: signError } = await db.storage
      .from(CONTENT_BUCKET)
      .createSignedUrl(path, 7200);
    if (signError || !data?.signedUrl)
      throw new Error("No se pudo preparar el archivo para Instagram.");
    signedUrls.push(data.signedUrl);
  }

  let externalId: string;
  try {
    if (typedPiece.plataforma === "instagram_story") {
      const container = await createContainer(config.instagramAccountId, {
        image_url: signedUrls[0]!,
        media_type: "STORIES",
      });
      externalId = await publishContainer(config.instagramAccountId, container);
    } else if (signedUrls.length > 1) {
      const children: string[] = [];
      for (const imageUrl of signedUrls) {
        children.push(
          await createContainer(config.instagramAccountId, {
            image_url: imageUrl,
            is_carousel_item: "true",
          }),
        );
      }
      const container = await createContainer(config.instagramAccountId, {
        media_type: "CAROUSEL",
        children: children.join(","),
        caption: fullCaption(typedPiece),
      });
      externalId = await publishContainer(config.instagramAccountId, container);
    } else {
      const container = await createContainer(config.instagramAccountId, {
        image_url: signedUrls[0]!,
        caption: fullCaption(typedPiece),
      });
      externalId = await publishContainer(config.instagramAccountId, container);
    }

    let permalink: string | null = null;
    try {
      const published = await graph(externalId, undefined, {
        fields: "id,permalink",
      });
      permalink =
        typeof published.permalink === "string" ? published.permalink : null;
    } catch {
      // El post ya fue aceptado; el permalink se completará en la próxima sincronización.
    }
    const now = new Date().toISOString();
    await db
      .from("contenido_publicaciones_log")
      .insert({
        pieza_id: typedPiece.id,
        integracion_id: null,
        red: "instagram",
        estado: "publicado",
        id_externo: externalId,
        respuesta: { permalink },
        publicado_at: now,
        creado_por: createdBy,
      });
    await db
      .from("piezas_contenido")
      .update({
        estado: "publicada",
        publicado_at: now,
        meta_post_id: externalId,
        meta_error: null,
        publication_locked_at: null,
        publication_next_retry_at: null,
        published_permalink: permalink,
        updated_at: now,
      })
      .eq("id", typedPiece.id);
    return { id: externalId, permalink, alreadyPublished: false };
  } catch (cause) {
    const message =
      cause instanceof Error
        ? cause.message
        : "Instagram rechazó la publicación.";
    const attempts = Number(typedPiece.publication_attempts || 0);
    const terminal = attempts >= 3;
    const retryMinutes = Math.min(60, Math.max(5, 5 * 2 ** attempts));
    await db
      .from("contenido_publicaciones_log")
      .insert({
        pieza_id: typedPiece.id,
        integracion_id: null,
        red: "instagram",
        estado: "fallido",
        error: message,
        respuesta: { attempts },
        creado_por: createdBy,
      });
    await db
      .from("piezas_contenido")
      .update({
        estado: terminal ? "fallida" : typedPiece.estado,
        meta_error: message,
        publication_locked_at: null,
        publication_next_retry_at: terminal
          ? null
          : new Date(Date.now() + retryMinutes * 60_000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", typedPiece.id);
    throw cause;
  }
}
