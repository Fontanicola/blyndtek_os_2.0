import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminUser } from "@/lib/require-admin";
import { CONTENT_BUCKET, getBlyndtekContentBrand } from "@/lib/contenido/blyndtek";
import { PlantillaSlide } from "@/lib/contenido/plantillaSlide";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ContenidoDatabase, JsonValue, PiezaContenido } from "@/types/contenido";

export const runtime = "nodejs";

type RouteContext = {
  params: {
    id: string;
  };
};

type SlideRenderable = {
  titulo: string;
  texto: string;
};

const INTER_REGULAR_FONT_URL = "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf";
const INTER_BOLD_FONT_URL = "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZg.ttf";
const BLYNDTEK_LOGO_PATH = "Logo_Blyndtek_plataforma_negro.svg";

type InterFonts = {
  regular: ArrayBuffer;
  bold: ArrayBuffer;
};

let interFontsPromise: Promise<InterFonts> | null = null;
let logoDataUriPromise: Promise<string> | null = null;

async function fetchFont(url: string, label: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo cargar la fuente Inter ${label} para renderizar la pieza.`);
  }

  const fontData = await response.arrayBuffer();
  if (fontData.byteLength === 0) {
    throw new Error(`La fuente Inter ${label} llegó vacía.`);
  }

  return fontData;
}

function getInterFonts() {
  interFontsPromise ??= Promise.all([
    fetchFont(INTER_REGULAR_FONT_URL, "Regular"),
    fetchFont(INTER_BOLD_FONT_URL, "Bold")
  ]).then(([regular, bold]) => ({ regular, bold }));

  return interFontsPromise;
}

function getBlyndtekLogoDataUri() {
  logoDataUriPromise ??= readFile(join(process.cwd(), "public", BLYNDTEK_LOGO_PATH), "utf8").then(
    (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  );

  return logoDataUriPromise;
}

async function assertImageUrlAccessible(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`El fondo generado no está accesible para el render (${response.status}).`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    throw new Error("El fondo generado no es una imagen válida.");
  }
}

function asRecord(value: JsonValue | null): Record<string, JsonValue | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getSlidesFromGuion(pieza: PiezaContenido): SlideRenderable[] {
  const guion = asRecord(pieza.guion);
  const slides = Array.isArray(guion.slides) ? guion.slides : null;

  if (slides) {
    return slides
      .map((slide, index) => {
        const record = asRecord(slide as JsonValue);
        const titulo = asString(record.titulo_slide) || `Slide ${index + 1}`;
        const texto = asString(record.texto);

        if (!texto) {
          return null;
        }

        return { titulo, texto };
      })
      .filter((slide): slide is SlideRenderable => Boolean(slide));
  }

  const textoPrincipal = asString(guion.texto_principal);
  if (textoPrincipal) {
    return [
      {
        titulo: pieza.titulo,
        texto: textoPrincipal
      }
    ];
  }

  return [];
}

async function renderSlide(
  slide: SlideRenderable,
  index: number,
  total: number,
  fonts: InterFonts,
  fondoUrl: string | null,
  logoUrl: string
) {
  const response = new ImageResponse(
    PlantillaSlide({
      titulo: slide.titulo,
      texto: slide.texto,
      indiceSlide: index,
      totalSlides: total,
      fondoUrl,
      logoUrl
    }),
    {
      width: 1080,
      height: 1350,
      fonts: [
        {
          name: "Inter",
          data: fonts.regular.slice(0),
          weight: 400,
          style: "normal"
        },
        {
          name: "Inter",
          data: fonts.bold.slice(0),
          weight: 700,
          style: "normal"
        }
      ]
    }
  );

  return Buffer.from(await response.arrayBuffer());
}

async function getSignedBackgroundUrl(
  supabase: SupabaseClient<ContenidoDatabase>,
  fondoStoragePath: string | null | undefined
) {
  if (!fondoStoragePath) {
    return null;
  }

  const { data, error } = await supabase.storage.from(CONTENT_BUCKET).createSignedUrl(fondoStoragePath, 60 * 30);
  if (error || !data?.signedUrl) {
    return null;
  }

  await assertImageUrlAccessible(data.signedUrl);

  return data.signedUrl;
}

function isServiceRoleAuthorized(request: Request) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(serviceRoleKey && request.headers.get("authorization") === `Bearer ${serviceRoleKey}`);
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const admin = await getAdminUser();
    if (!admin && !isServiceRoleAuthorized(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient() as unknown as SupabaseClient<ContenidoDatabase>;
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

    if (pieza.plataforma !== "instagram_feed") {
      return NextResponse.json({ error: "Solo se renderizan piezas de feed." }, { status: 400 });
    }

    const slides = getSlidesFromGuion(pieza);
    if (slides.length === 0) {
      return NextResponse.json({ error: "La pieza no tiene guion renderizable." }, { status: 400 });
    }

    const fonts = await getInterFonts();
    const logoUrl = await getBlyndtekLogoDataUri();
    const fondoUrl = await getSignedBackgroundUrl(supabase, pieza.fondo_storage_path);
    const generatedPaths: string[] = [];

    for (const [index, slide] of slides.entries()) {
      const imageBuffer = await renderSlide(slide, index, slides.length, fonts, fondoUrl, logoUrl);
      const storagePath = `contenido/${params.id}-slide-${index + 1}.png`;

      const { error: uploadError } = await supabase.storage.from(CONTENT_BUCKET).upload(storagePath, imageBuffer, {
        contentType: "image/png",
        upsert: true
      });

      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }

      generatedPaths.push(storagePath);
    }

    const oldGeneratedPaths = Array.isArray(pieza.imagenes_generadas) ? pieza.imagenes_generadas : [];
    const stalePaths = oldGeneratedPaths.filter((path) => !generatedPaths.includes(path));
    if (stalePaths.length > 0) {
      await supabase.storage.from(CONTENT_BUCKET).remove(stalePaths);
    }

    const nextState = pieza.estado === "idea" ? "en_diseno" : pieza.estado;
    const { data: updatedPieza, error: updateError } = await supabase
      .from("piezas_contenido")
      .update({
        imagenes_generadas: generatedPaths,
        storage_path: generatedPaths[0],
        estado: nextState,
        updated_at: new Date().toISOString()
      } as never)
      .eq("id", params.id)
      .select("*, pilar:pilares_contenido(*)")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        imagenes_generadas: generatedPaths,
        pieza: updatedPieza
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
