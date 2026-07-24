import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Diagnostico } from "@/types/diagnostico";

type RouteContext = {
  params: {
    token: string;
  };
};

type ChatBody = {
  mensaje?: string;
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

type DiagnosticoConLead = Diagnostico & {
  lead?: {
    id: string;
    empresa: string;
    vendedor_id: string | null;
  } | null;
};

type ChatPayload = {
  informe_hallazgos: unknown;
  modulos_sugeridos: unknown;
};

function cleanJson(rawText: string) {
  return rawText
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function extractJson(rawText: string) {
  const start = rawText.indexOf("{");
  const end = rawText.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return rawText.slice(start, end + 1);
}

function parseChatPayload(rawText: string): ChatPayload {
  const attempts = [cleanJson(rawText), extractJson(rawText)].filter((value): value is string => Boolean(value));

  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt) as Partial<ChatPayload>;

      if (parsed.informe_hallazgos && parsed.modulos_sugeridos) {
        return {
          informe_hallazgos: parsed.informe_hallazgos,
          modulos_sugeridos: parsed.modulos_sugeridos
        };
      }
    } catch {
      continue;
    }
  }

  throw new Error("La IA no devolvió una modificación válida.");
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const body = (await request.json()) as ChatBody;
    const mensaje = body.mensaje?.trim();

    if (!mensaje) {
      return NextResponse.json({ error: "Escribí qué querés modificar." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: diagnostico, error: diagnosticoError } = await supabase
      .from("diagnosticos")
      .select("*, lead:leads(id, empresa, vendedor_id)")
      .eq("token_publico", params.token.trim())
      .maybeSingle<DiagnosticoConLead>();

    if (diagnosticoError) {
      return NextResponse.json({ error: diagnosticoError.message }, { status: 500 });
    }

    if (!diagnostico) {
      return NextResponse.json({ error: "Diagnóstico no encontrado." }, { status: 404 });
    }

    if (
      currentUser.rol !== "admin" &&
      (currentUser.rol !== "comercial" || diagnostico.lead?.vendedor_id !== currentUser.id)
    ) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    if (diagnostico.estado !== "informe_generado") {
      return NextResponse.json({ error: "Primero generá el informe inicial." }, { status: 400 });
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
        max_tokens: 5000,
        temperature: 0.2,
        system: [
          "Sos un consultor senior de Blyndtek editando un informe diagnóstico y propuesta ya generados.",
          "Aplicá exactamente el pedido del usuario, manteniendo tono profesional, específico y comercialmente persuasivo.",
          "No inventes módulos nuevos ni precios. Preservá la estructura JSON existente.",
          "Separá claramente informe diagnóstico y propuesta de software. El diagnóstico no debe hablar de precio ni venta; la propuesta sí puede hablar de alcance, módulos e inversión.",
          "Si el documento incluye antes_despues o mapa_areas, preservalos y actualizalos con el mismo nivel de detalle profesional.",
          "Respondé SOLO con JSON válido: { informe_hallazgos: {...}, modulos_sugeridos: {...} }."
        ].join(" "),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: [
                  `Empresa: ${diagnostico.lead?.empresa ?? "Sin empresa"}`,
                  `Pedido de modificación: ${mensaje}`,
                  "JSON actual de informe_hallazgos:",
                  JSON.stringify(diagnostico.informe_hallazgos ?? {}, null, 2),
                  "JSON actual de modulos_sugeridos:",
                  JSON.stringify(diagnostico.modulos_sugeridos ?? {}, null, 2),
                  "Devolvé el documento completo actualizado, no solo el fragmento cambiado."
                ].join("\n\n")
              }
            ]
          }
        ]
      })
    });

    const anthropicPayload = (await anthropicResponse.json()) as AnthropicResponse;

    if (!anthropicResponse.ok) {
      return NextResponse.json(
        { error: anthropicPayload.error?.message ?? "Falló la modificación con IA." },
        { status: 500 }
      );
    }

    const responseText = anthropicPayload.content
      ?.filter((block): block is { type: "text"; text: string } => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (!responseText) {
      return NextResponse.json({ error: "La IA no devolvió contenido." }, { status: 500 });
    }

    const parsed = parseChatPayload(responseText);
    const { data: updatedDiagnostico, error: updateError } = await supabase
      .from("diagnosticos")
      .update({
        informe_hallazgos: parsed.informe_hallazgos,
        modulos_sugeridos: parsed.modulos_sugeridos
      })
      .eq("id", diagnostico.id)
      .select("*")
      .single();

    if (updateError || !updatedDiagnostico) {
      return NextResponse.json(
        { error: updateError?.message ?? "No se pudo guardar la modificación." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        diagnostico: updatedDiagnostico as Diagnostico
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
