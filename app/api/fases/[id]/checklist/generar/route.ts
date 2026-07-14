import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Feature } from "@/types/features";

type RouteContext = {
  params: {
    id: string;
  };
};

type AnthropicTextBlock = {
  type: "text";
  text: string;
};

type AnthropicResponse = {
  content?: Array<
    | {
        type: "text";
        text: string;
      }
    | {
        type: string;
      }
  >;
  error?: {
    message?: string;
  };
};

type ChecklistPayload = {
  items: string[];
};

function hasChecklistItems(value: unknown): value is ChecklistPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "items" in value &&
    Array.isArray((value as ChecklistPayload).items)
  );
}

function cleanClaudeJson(rawText: string) {
  return rawText
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function extractJsonBetweenBraces(rawText: string) {
  const start = rawText.indexOf("{");
  const end = rawText.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return rawText.slice(start, end + 1).trim();
}

function parseChecklistPayload(rawText: string): ChecklistPayload {
  const attempts = [cleanClaudeJson(rawText), extractJsonBetweenBraces(rawText)].filter(
    (attempt): attempt is string => Boolean(attempt)
  );

  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt) as Partial<ChecklistPayload> | string[];

      if (Array.isArray(parsed)) {
        const items = parsed
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter(Boolean);

        if (items.length > 0) {
          return { items };
        }
      }

      if (hasChecklistItems(parsed)) {
        const items = parsed.items
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter(Boolean);

        if (items.length > 0) {
          return { items };
        }
      }
    } catch {
      continue;
    }
  }

  throw new Error("Claude no devolvió una checklist JSON válida.");
}

function buildSystemPrompt() {
  return [
    "Sos un QA técnico.",
    "Tu tarea es generar una checklist de verificación manual, concreta y verificable.",
    "Respondé SOLO con JSON válido, sin texto adicional ni bloques de código."
  ].join(" ");
}

function buildPrompt(
  fase: { nombre: string; descripcion: string | null },
  features: Array<Pick<Feature, "nombre" | "descripcion">>
) {
  const subtareas = features
    .map((feature) => `- ${feature.nombre}: ${feature.descripcion}`)
    .join("\n");

  return [
    "Dada esta fase de un proyecto de software y sus subtareas, generá una checklist de verificación MANUAL que un humano no-técnico o semi-técnico pueda ejecutar para confirmar que el trabajo está bien hecho.",
    "Cada ítem debe ser una acción concreta y verificable (por ejemplo: 'Completar el formulario con un email inválido y confirmar que muestra error', no 'Verificar que el formulario funcione').",
    "Entre 4 y 10 ítems según la complejidad.",
    'Respondé SOLO con JSON: { "items": ["ítem 1", "ítem 2"] }.',
    `Fase: ${fase.nombre}${fase.descripcion ? ` — ${fase.descripcion}` : ""}`,
    `Subtareas:\n${subtareas || "- Sin subtareas registradas"}`
  ].join("\n\n");
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const replace = request.nextUrl.searchParams.get("reemplazar") === "true";
    const supabase = createAdminClient();

    const { data: phase, error: phaseError } = await supabase
      .from("fases_proyecto")
      .select("id, nombre, descripcion, proyecto_id")
      .eq("id", params.id)
      .single();

    if (phaseError || !phase) {
      const status = phaseError?.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: phaseError?.message ?? "No se encontró la fase." }, { status });
    }

    const { data: existingItems, error: existingError } = await supabase
      .from("checklist_qa")
      .select("*")
      .eq("fase_id", params.id)
      .order("orden", { ascending: true });

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    if ((existingItems?.length ?? 0) > 0 && !replace) {
      return NextResponse.json(
        { error: "Ya existe una checklist para esta fase.", data: existingItems },
        { status: 409 }
      );
    }

    const { data: features, error: featuresError } = await supabase
      .from("features")
      .select("nombre, descripcion")
      .eq("fase_id", params.id)
      .order("orden", { ascending: true });

    if (featuresError) {
      return NextResponse.json({ error: featuresError.message }, { status: 500 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Falta ANTHROPIC_API_KEY." }, { status: 500 });
    }

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1200,
        temperature: 0.2,
        system: buildSystemPrompt(),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: buildPrompt(
                  {
                    nombre: phase.nombre,
                    descripcion: phase.descripcion ?? null
                  },
                  (features ?? []) as Array<Pick<Feature, "nombre" | "descripcion">>
                )
              } satisfies AnthropicTextBlock
            ]
          }
        ]
      })
    });

    const anthropicPayload = (await anthropicResponse.json()) as AnthropicResponse;

    if (!anthropicResponse.ok) {
      return NextResponse.json(
        { error: anthropicPayload.error?.message ?? "Falló la generación con Claude." },
        { status: 500 }
      );
    }

    const responseText = anthropicPayload.content
      ?.filter((block): block is { type: "text"; text: string } => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (!responseText) {
      return NextResponse.json({ error: "Claude no devolvió contenido textual." }, { status: 500 });
    }

    const parsed = parseChecklistPayload(responseText);

    if (replace && (existingItems?.length ?? 0) > 0) {
      const { error: deleteError } = await supabase.from("checklist_qa").delete().eq("fase_id", params.id);

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }
    }

    const itemsToInsert = parsed.items.map((item, index) => ({
      fase_id: params.id,
      item,
      completado: false,
      completado_por: null,
      completado_at: null,
      orden: index,
      generado_por_ia: true
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("checklist_qa")
      .insert(itemsToInsert)
      .select("*");

    if (insertError || !inserted) {
      return NextResponse.json({ error: insertError?.message ?? "No se pudo guardar la checklist." }, { status: 500 });
    }

    return NextResponse.json({
      data: (inserted ?? []).sort((first, second) => first.orden - second.orden)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
