import { callClaudeJson } from "@/lib/agentes/cronista";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export type WhatsappAnalysis = {
  summary: string;
  intent: "bajo" | "medio" | "alto" | "cliente" | "soporte" | "spam";
  sentiment: "positivo" | "neutral" | "negativo" | "mixto";
  urgency: "baja" | "media" | "alta" | "critica";
  topics: string[];
  objections: string[];
  buyingSignals: string[];
  nextAction: string;
  suggestedReply: string | null;
  leadScoreAdjustment: number;
  confidence: number;
  model: string;
};

const INTENTS = new Set<WhatsappAnalysis["intent"]>([
  "bajo",
  "medio",
  "alto",
  "cliente",
  "soporte",
  "spam",
]);
const SENTIMENTS = new Set<WhatsappAnalysis["sentiment"]>([
  "positivo",
  "neutral",
  "negativo",
  "mixto",
]);
const URGENCIES = new Set<WhatsappAnalysis["urgency"]>([
  "baja",
  "media",
  "alta",
  "critica",
]);

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim().slice(0, 3000) : fallback;
}
function list(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 8)
    : [];
}
function clamp(value: unknown, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : min;
}

function deterministicAnalysis(
  messages: Array<{ direction: string; text_preview: string | null }>,
  stage?: string | null,
): WhatsappAnalysis {
  const inbound = messages
    .filter((message) => message.direction === "inbound")
    .map((message) => message.text_preview || "")
    .join(" ");
  const normalized = inbound.toLowerCase();
  const spam = /casino|crypto|premio|ganaste|inversi[oó]n garantizada/.test(
    normalized,
  );
  const urgent = /urgente|hoy|ya|cuanto antes|esta semana|inmediato/.test(
    normalized,
  );
  const buying =
    /precio|presupuesto|cotiz|contratar|avanzar|reuni[oó]n|agenda|diagn[oó]stico|propuesta/.test(
      normalized,
    );
  const objectionPrice = /caro|precio|presupuesto|costo|usd|d[oó]lar/.test(
    normalized,
  );
  const negative = /problema|mal|error|reclamo|molesto|no funciona|demora/.test(
    normalized,
  );
  const intent: WhatsappAnalysis["intent"] = spam
    ? "spam"
    : stage === "ganado"
      ? "cliente"
      : buying
        ? "alto"
        : messages.length >= 4
          ? "medio"
          : "bajo";
  return {
    summary: inbound
      ? `Conversación sobre: ${inbound.slice(0, 280)}${inbound.length > 280 ? "…" : ""}`
      : "Conversación sin suficiente texto para resumir.",
    intent,
    sentiment: negative ? "negativo" : buying ? "positivo" : "neutral",
    urgency: urgent ? "alta" : buying ? "media" : "baja",
    topics: buying ? ["consulta comercial"] : ["consulta general"],
    objections: objectionPrice ? ["precio o presupuesto"] : [],
    buyingSignals: buying ? ["pregunta por avance, precio o reunión"] : [],
    nextAction: spam
      ? "Cerrar como spam."
      : urgent
        ? "Responder hoy y proponer un próximo paso concreto."
        : buying
          ? "Responder, validar encaje y proponer reunión o diagnóstico."
          : "Responder y hacer una pregunta de calificación.",
    suggestedReply: spam
      ? null
      : "Hola, gracias por escribirnos. Para orientarte bien, ¿me contás brevemente qué proceso querés mejorar y qué impacto tiene hoy en la operación?",
    leadScoreAdjustment: spam
      ? -30
      : buying
        ? 18
        : messages.length >= 4
          ? 6
          : 0,
    confidence: inbound ? 0.58 : 0.25,
    model: "deterministic-v1",
  };
}

function parseAiAnalysis(value: unknown): WhatsappAnalysis {
  const row =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const intent = INTENTS.has(row.intent as WhatsappAnalysis["intent"])
    ? (row.intent as WhatsappAnalysis["intent"])
    : "medio";
  const sentiment = SENTIMENTS.has(
    row.sentiment as WhatsappAnalysis["sentiment"],
  )
    ? (row.sentiment as WhatsappAnalysis["sentiment"])
    : "neutral";
  const urgency = URGENCIES.has(row.urgency as WhatsappAnalysis["urgency"])
    ? (row.urgency as WhatsappAnalysis["urgency"])
    : "media";
  return {
    summary: text(row.summary, "Sin resumen disponible."),
    intent,
    sentiment,
    urgency,
    topics: list(row.topics),
    objections: list(row.objections),
    buyingSignals: list(row.buying_signals),
    nextAction: text(row.next_action, "Revisar manualmente."),
    suggestedReply: text(row.suggested_reply) || null,
    leadScoreAdjustment: Math.round(clamp(row.lead_score_adjustment, -30, 30)),
    confidence: clamp(row.confidence, 0, 1),
    model: "claude-sonnet-4-6",
  };
}

export async function analyzeWhatsappConversation(
  conversationId: string,
  options: { useAi?: boolean } = {},
) {
  const db = createUntypedAdminClient();
  const { data: conversation, error: conversationError } = await db
    .from("whatsapp_conversations")
    .select(
      "id,wa_id,lead_id,contact_name,status,referral,first_message_at,last_message_at",
    )
    .eq("id", conversationId)
    .maybeSingle();
  if (conversationError) throw conversationError;
  if (!conversation) throw new Error("Conversación inexistente.");
  const [{ data: messages, error: messagesError }, leadResult] =
    await Promise.all([
      db
        .from("whatsapp_messages")
        .select("id,direction,message_type,text_preview,timestamp")
        .eq("conversation_id", conversationId)
        .order("timestamp", { ascending: true })
        .limit(120),
      conversation.lead_id
        ? db
            .from("leads")
            .select(
              "empresa,rubro,etapa,canal_origen,campana_origen,contexto,mensaje_inicial,presupuesto_estimado",
            )
            .eq("id", conversation.lead_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
  if (messagesError) throw messagesError;
  if (leadResult.error) throw leadResult.error;
  const cleanMessages = messages ?? [];
  let analysis = deterministicAnalysis(cleanMessages, leadResult.data?.etapa);
  if (
    options.useAi !== false &&
    process.env.ANTHROPIC_API_KEY &&
    cleanMessages.some((message) => message.text_preview)
  ) {
    const transcript = cleanMessages
      .map(
        (message) =>
          `[${message.direction === "inbound" ? "LEAD" : "BLYNDTEK"}] ${message.text_preview || `[${message.message_type || "mensaje"}]`}`,
      )
      .join("\n")
      .slice(-18000);
    try {
      const result = await callClaudeJson(
        "Sos analista comercial de Blyndtek. Analizá conversaciones de WhatsApp sin inventar información. Diferenciá interés real, soporte y spam. La respuesta sugerida debe ser breve, humana, en español rioplatense, no prometer resultados y no presionar. Devolvé únicamente JSON válido.",
        `Contexto CRM:\n${JSON.stringify(leadResult.data || {})}\n\nConversación:\n${transcript}\n\nDevolvé: {"summary":"...","intent":"bajo|medio|alto|cliente|soporte|spam","sentiment":"positivo|neutral|negativo|mixto","urgency":"baja|media|alta|critica","topics":["..."],"objections":["..."],"buying_signals":["..."],"next_action":"...","suggested_reply":"... o null","lead_score_adjustment":0,"confidence":0.0}`,
        1100,
      );
      analysis = parseAiAnalysis(result.value);
    } catch {
      /* El análisis determinístico mantiene la operación disponible. */
    }
  }
  const lastMessage = cleanMessages[cleanMessages.length - 1];
  const now = new Date().toISOString();
  const stored = {
    conversation_id: conversation.id,
    lead_id: conversation.lead_id,
    summary: analysis.summary,
    intent: analysis.intent,
    sentiment: analysis.sentiment,
    urgency: analysis.urgency,
    topics: analysis.topics,
    objections: analysis.objections,
    buying_signals: analysis.buyingSignals,
    next_action: analysis.nextAction,
    suggested_reply: analysis.suggestedReply,
    lead_score_adjustment: analysis.leadScoreAdjustment,
    confidence: analysis.confidence,
    model: analysis.model,
    last_message_id: lastMessage?.id || null,
    raw: { messageCount: cleanMessages.length },
    analyzed_at: now,
    updated_at: now,
  };
  const { error: upsertError } = await db
    .from("whatsapp_conversation_analysis")
    .upsert(stored, { onConflict: "conversation_id" });
  if (upsertError) throw upsertError;
  if (conversation.lead_id)
    await db.from("marketing_touchpoints").upsert(
      {
        source_key: `whatsapp-analysis:${conversation.id}:${lastMessage?.id || "empty"}`,
        lead_id: conversation.lead_id,
        channel: "whatsapp",
        event_name: `intent_${analysis.intent}`,
        occurred_at: now,
        metadata: {
          urgency: analysis.urgency,
          sentiment: analysis.sentiment,
          scoreAdjustment: analysis.leadScoreAdjustment,
        },
      },
      { onConflict: "source_key" },
    );
  return analysis;
}

export async function analyzePendingWhatsappConversations(limit = 20) {
  const db = createUntypedAdminClient();
  const { data: conversations, error } = await db
    .from("whatsapp_conversations")
    .select("id,last_message_at")
    .order("last_message_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const results = await Promise.allSettled(
    (conversations ?? []).map((conversation) =>
      analyzeWhatsappConversation(conversation.id),
    ),
  );
  return {
    processed: results.filter((result) => result.status === "fulfilled").length,
    failed: results.filter((result) => result.status === "rejected").length,
  };
}
