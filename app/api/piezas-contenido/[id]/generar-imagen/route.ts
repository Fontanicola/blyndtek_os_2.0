import { NextResponse } from "next/server";
import { createHiggsfieldClient } from "@higgsfield/client/v2";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminUser } from "@/lib/require-admin";
import { CONTENT_BUCKET, getBlyndtekContentBrand } from "@/lib/contenido/blyndtek";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ContenidoDatabase, JsonValue, MarcaContenido, PiezaContenido } from "@/types/contenido";

export const runtime = "nodejs";
export const maxDuration = 60;

type RouteContext = {
  params: {
    id: string;
  };
};

type ClaudeTextBlock = {
  type: "text";
  text: string;
};

type ClaudeResponse = {
  content?: Array<ClaudeTextBlock | { type: string }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
  error?: {
    message?: string;
  };
};

type HiggsfieldImage = {
  url: string;
};

type HiggsfieldResult = {
  status?: string;
  request_id?: string;
  images?: HiggsfieldImage[];
};

const HIGGSFIELD_MODEL = "/higgsfield-ai/soul/v2/standard";

function asRecord(value: JsonValue | null): Record<string, JsonValue | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function buildBrandContext(marca: MarcaContenido) {
  return [
    `Tone of voice: ${marca.tono_voz ?? "not specified"}`,
    `Target audience: ${marca.publico_objetivo ?? "not specified"}`,
    `Color palette: ${marca.paleta_colores ?? "lavender #DCD9F2, sky blue #D9EAF5, white #FFFFFF, black #0B0E14"}`,
    `What to show: ${marca.que_mostrar ?? "soft, clean, premium, airy visuals"}`,
    `What to avoid: ${marca.que_evitar ?? "generic stock visuals, fake user interfaces, illegible text"}`
  ].join("\n");
}

function getPieceTopic(pieza: PiezaContenido) {
  const guion = asRecord(pieza.guion);
  const slides = Array.isArray(guion.slides) ? guion.slides : [];
  const firstSlide = slides.length > 0 ? asRecord(slides[0] as JsonValue) : {};

  return [
    asString(guion.titulo),
    asString(firstSlide.titulo_slide),
    asString(firstSlide.texto),
    asString(guion.texto_principal),
    pieza.titulo
  ]
    .filter(Boolean)
    .slice(0, 3)
    .join("\n");
}

function getTextFromClaude(payload: ClaudeResponse) {
  const text = payload.content
    ?.filter((block): block is ClaudeTextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error(payload.error?.message ?? "Claude no devolvió un prompt válido.");
  }

  return text;
}

function calculateClaudeCost(inputTokens: number | null, outputTokens: number | null) {
  if (inputTokens === null && outputTokens === null) {
    return null;
  }

  return Number((((inputTokens ?? 0) / 1_000_000) * 3 + ((outputTokens ?? 0) / 1_000_000) * 15).toFixed(6));
}

function getExtensionFromMime(mimeType: string, fallbackUrl?: string) {
  if (mimeType.includes("jpeg")) return "jpg";
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("gif")) return "gif";
  if (mimeType.includes("avif")) return "avif";

  const extension = fallbackUrl?.split("?")[0]?.split(".").pop()?.toLowerCase();
  if (extension && extension.length <= 5) return extension;

  return "png";
}

async function generateBackgroundPromptWithClaude({
  marca,
  pieza
}: {
  marca: MarcaContenido;
  pieza: PiezaContenido;
}) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    throw new Error("ANTHROPIC_API_KEY no está configurada.");
  }

  const system = [
    "Act as a senior art director specialized in visual identity for minimalist B2B tech social media brands, with the calm precision of Linear, Stripe, and Mercury.",
    "Generate one final English prompt for an AI image generator.",
    "The prompt must describe ONLY an abstract visual background or atmosphere for a software factory brand.",
    "The background must NEVER be a flat full-frame gradient with no composition. It needs real visual intent: use the rule of thirds, define a clear negative-space area where real text will be overlaid later, usually the left third or upper third, never the exact center filling the entire frame.",
    "Use an iridescent pastel lavender-sky-white palette, soft grain, diffused light, and at most 1-2 subtle abstract elements such as one organic gradient shape, one quiet curve, or one restrained geometric plane.",
    "The background is the stage, not the protagonist. It must feel premium, quiet, editorial, and specific to a serious B2B technology company.",
    "Avoid absolutely: motivational poster effects, light rays, sparkles, glowing particles, bokeh, generic stock textures, clutter, anything visually loud, or anything that competes with the overlaid text.",
    "PROHIBITED: any text, letters, words, numbers, typography, labels, icons with labels, UI mockups, dashboards, charts, screens, buttons, data visualization, tables, menus, browser windows, forms, or anything that requires readable information.",
    "Return ONLY the final prompt. No explanation."
  ].join(" ");

  const userPrompt = [
    "Create a background prompt for this Blyndtek content piece.",
    "",
    "Brand identity:",
    buildBrandContext(marca),
    "",
    "Piece topic/title:",
    getPieceTopic(pieza),
    "",
    "The generated image will sit behind real text rendered later with code, so the background must leave enough clean negative space and must contain no readable or fake informational elements."
  ].join("\n");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 900,
      temperature: 0.35,
      system,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: userPrompt }]
        }
      ]
    })
  });

  const payload = (await response.json()) as ClaudeResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "No se pudo generar el prompt de fondo con Claude.");
  }

  const inputTokens = payload.usage?.input_tokens ?? null;
  const outputTokens = payload.usage?.output_tokens ?? null;

  return {
    prompt: getTextFromClaude(payload),
    tokensEntrada: inputTokens,
    tokensSalida: outputTokens,
    costoGeneracionUsd: calculateClaudeCost(inputTokens, outputTokens)
  };
}

async function downloadGeneratedImage(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Higgsfield generó una imagen pero no se pudo descargar (${response.status}).`);
  }

  const contentType = response.headers.get("content-type") ?? "image/png";
  if (!contentType.startsWith("image/")) {
    throw new Error("El resultado de Higgsfield no es una imagen válida.");
  }

  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    contentType,
    extension: getExtensionFromMime(contentType, url)
  };
}

async function markGenerationFailed(supabase: SupabaseClient<ContenidoDatabase>, id: string) {
  await supabase
    .from("piezas_contenido")
    .update({ higgsfield_estado: "fallido", updated_at: new Date().toISOString() } as never)
    .eq("id", id);
}

function isServiceRoleAuthorized(request: Request) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(serviceRoleKey && request.headers.get("authorization") === `Bearer ${serviceRoleKey}`);
}

export async function POST(_request: Request, { params }: RouteContext) {
  const supabase = createAdminClient() as unknown as SupabaseClient<ContenidoDatabase>;

  try {
    const admin = await getAdminUser();
    if (!admin && !isServiceRoleAuthorized(_request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const higgsfieldKeyId = process.env.HIGGSFIELD_API_KEY_ID;
    const higgsfieldSecret = process.env.HIGGSFIELD_API_KEY_SECRET;
    if (!higgsfieldKeyId || !higgsfieldSecret) {
      return NextResponse.json({ error: "Las credenciales de Higgsfield no están configuradas." }, { status: 500 });
    }

    const marca = await getBlyndtekContentBrand(supabase);
    if (!marca) {
      return NextResponse.json({ error: "Marca Blyndtek not found" }, { status: 404 });
    }

    const { data: piezaData, error: piezaError } = await supabase
      .from("piezas_contenido")
      .select("*, pilar:pilares_contenido(*)")
      .eq("id", params.id)
      .eq("marca_id", marca.id)
      .maybeSingle();

    if (piezaError) {
      return NextResponse.json({ error: piezaError.message }, { status: 500 });
    }

    const pieza = piezaData as PiezaContenido | null;
    if (!pieza) {
      return NextResponse.json({ error: "Pieza not found" }, { status: 404 });
    }

    const promptData = await generateBackgroundPromptWithClaude({ marca, pieza });

    await supabase
      .from("piezas_contenido")
      .update({
        prompt_fondo: promptData.prompt,
        tokens_entrada: promptData.tokensEntrada,
        tokens_salida: promptData.tokensSalida,
        costo_generacion_usd: promptData.costoGeneracionUsd,
        higgsfield_estado: "procesando",
        updated_at: new Date().toISOString()
      } as never)
      .eq("id", params.id);

    const client = createHiggsfieldClient({
      credentials: `${higgsfieldKeyId}:${higgsfieldSecret}`
    });
    const higgsfieldResult = (await client.subscribe(HIGGSFIELD_MODEL, {
      input: {
        prompt: promptData.prompt,
        width_and_height: "1080x1350",
        quality: "1080p",
        batch_size: 1
      },
      withPolling: true
    })) as HiggsfieldResult;

    const generatedUrl = higgsfieldResult.images?.[0]?.url;
    if (!generatedUrl) {
      throw new Error("Higgsfield no devolvió una URL de imagen de fondo.");
    }

    const generatedImage = await downloadGeneratedImage(generatedUrl);
    const storagePath = `contenido/${params.id}-fondo.${generatedImage.extension}`;
    const { error: uploadError } = await supabase.storage.from(CONTENT_BUCKET).upload(storagePath, generatedImage.bytes, {
      contentType: generatedImage.contentType,
      upsert: true
    });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    if (pieza.fondo_storage_path && pieza.fondo_storage_path !== storagePath) {
      await supabase.storage.from(CONTENT_BUCKET).remove([pieza.fondo_storage_path]);
    }

    const { data: updatedPieza, error: updateError } = await supabase
      .from("piezas_contenido")
      .update({
        fondo_storage_path: storagePath,
        generado_con_ia: true,
        higgsfield_estado: "completado",
        higgsfield_job_id: higgsfieldResult.request_id ?? null,
        updated_at: new Date().toISOString()
      } as never)
      .eq("id", params.id)
      .select("*, pilar:pilares_contenido(*)")
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({
      data: {
        prompt_fondo: promptData.prompt,
        fondo_storage_path: storagePath,
        fondo_url: `/api/piezas-contenido/${params.id}/imagen/${encodeURIComponent(storagePath)}`,
        tokens_entrada: promptData.tokensEntrada,
        tokens_salida: promptData.tokensSalida,
        costo_generacion_usd: promptData.costoGeneracionUsd,
        pieza: updatedPieza
      }
    });
  } catch (error) {
    await markGenerationFailed(supabase, params.id);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
