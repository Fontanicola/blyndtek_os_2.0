import { createUntypedAdminClient } from "@/lib/supabase/admin";
import type { MarketingIntelligenceOverview } from "@/types/marketingHub";

export type IntelligenceTrigger = "manual" | "cron" | "lead_created" | "stage_changed";

const stageIntent: Record<string, number> = {
  por_contactar: 5, contactado: 15, seguimiento: 28, calificado: 52,
  diagnostico_ofrecido: 66, diagnostico_pagado: 82, cotizacion: 92,
  ganado: 100, descartado: 0
};
const freeEmailDomains = new Set(["gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "icloud.com", "live.com"]);
const highIntentEvents = new Set(["form_start", "form_submit", "lead", "whatsapp_click", "calendly_click"]);

function n(value: unknown) { const parsed = Number(value ?? 0); return Number.isFinite(parsed) ? parsed : 0; }
function clamp(value: number) { return Math.max(0, Math.min(100, Math.round(value))); }
function ratio(numerator: number, denominator: number) { return denominator ? numerator / denominator : null; }
function stringArray(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }

function nextAction(stage: string, missing: string[], score: number) {
  if (stage === "ganado") return "Pedir feedback, documentar por qué compró y activar referidos.";
  if (stage === "descartado") return "Registrar el motivo con precisión y excluirlo de audiencias de captación.";
  if (missing.length >= 3) return `Completar datos clave: ${missing.slice(0, 3).join(", ")}.`;
  if (stage === "por_contactar") return score >= 70 ? "Contactar hoy: lead prioritario con señales fuertes." : "Hacer primer contacto y validar problema, autoridad y urgencia.";
  if (stage === "contactado" || stage === "seguimiento") return "Definir próximo paso con fecha y calificar necesidad, autoridad y presupuesto.";
  if (stage === "calificado") return "Ofrecer diagnóstico y registrar objeciones o criterio de compra.";
  if (stage === "diagnostico_ofrecido") return "Dar seguimiento al diagnóstico y resolver la principal objeción.";
  if (stage === "diagnostico_pagado") return "Convertir hallazgos en propuesta con impacto económico y plazo.";
  if (stage === "cotizacion") return "Cerrar decisión: confirmar decisor, fecha y condición pendiente.";
  return "Revisar el lead y definir un próximo paso concreto.";
}

function frequency(values: Array<string | null | undefined>, limit = 3) {
  const counts = new Map<string, number>();
  for (const raw of values) { const value = raw?.trim(); if (value) counts.set(value, (counts.get(value) ?? 0) + 1); }
  return [...counts.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count).slice(0, limit);
}

export async function refreshMarketingIntelligence(initiatedBy: string | null, triggerType: IntelligenceTrigger, onlyLeadIds?: string[]) {
  const db = createUntypedAdminClient();
  const { data: run, error: runError } = await db.from("marketing_intelligence_runs").insert({ trigger_type: triggerType, status: "running", initiated_by: initiatedBy }).select("id").single();
  if (runError || !run) throw new Error(runError?.message || "No se pudo iniciar el análisis de marketing.");

  try {
    let leadsQuery = db.from("leads").select("id,created_at,updated_at,empresa,rubro,ubicacion,web,contacto_1_nombre,contacto_1_tel,contacto_email,etapa,canal_origen,campana_origen,contexto,mensaje_inicial,notas,presupuesto_estimado,valor_estimado,monto_propuesto_desarrollo,monto_propuesto_mensual,monto_negociado_desarrollo,monto_negociado_mensual,consentimiento_marketing,web_session_id,meta_campaign_id,meta_adset_id,meta_ad_id,landing_url");
    if (onlyLeadIds?.length) leadsQuery = leadsQuery.in("id", onlyLeadIds);
    const { data: leads, error: leadsError } = await leadsQuery;
    if (leadsError) throw leadsError;
    const leadRows = leads ?? [];
    const leadIds = leadRows.map((lead) => String(lead.id));
    if (!leadIds.length) {
      await db.from("marketing_intelligence_runs").update({ status: "success", finished_at: new Date().toISOString() }).eq("id", run.id);
      return { profiles: 0, touchpoints: 0, audienceEligible: 0 };
    }

    const [{ data: sessions, error: sessionsError }, { data: conversations, error: conversationsError }] = await Promise.all([
      db.from("web_sessions").select("id,converted_lead_id,started_at,last_seen_at,utm_source,utm_medium,utm_campaign,meta_campaign_id,meta_adset_id,meta_ad_id,landing_path,event_count,engaged").in("converted_lead_id", leadIds),
      db.from("whatsapp_conversations").select("id,lead_id,first_message_at,last_message_at,status,contact_name,message_count").in("lead_id", leadIds)
    ]);
    if (sessionsError) throw sessionsError;
    if (conversationsError) throw conversationsError;
    const sessionRows = sessions ?? [];
    const sessionIds = sessionRows.map((session) => String(session.id));
    const { data: webEvents, error: webEventsError } = sessionIds.length
      ? await db.from("web_events").select("event_id,session_id,event_name,path,occurred_at,properties").in("session_id", sessionIds)
      : { data: [], error: null };
    if (webEventsError) throw webEventsError;

    const sessionById = new Map(sessionRows.map((session) => [String(session.id), session]));
    const eventsByLead = new Map<string, Array<Record<string, unknown>>>();
    for (const event of webEvents ?? []) {
      const session = sessionById.get(String(event.session_id));
      const leadId = session?.converted_lead_id ? String(session.converted_lead_id) : null;
      if (!leadId) continue;
      const current = eventsByLead.get(leadId) ?? []; current.push(event); eventsByLead.set(leadId, current);
    }
    const sessionsByLead = new Map<string, typeof sessionRows>();
    for (const session of sessionRows) { const leadId = String(session.converted_lead_id); const current = sessionsByLead.get(leadId) ?? []; current.push(session); sessionsByLead.set(leadId, current); }
    const conversationsByLead = new Map<string, typeof conversations>();
    for (const conversation of conversations ?? []) { const leadId = String(conversation.lead_id); const current = conversationsByLead.get(leadId) ?? []; current.push(conversation); conversationsByLead.set(leadId, current); }

    const touchpoints: Array<Record<string, unknown>> = [];
    const profiles: Array<Record<string, unknown>> = [];
    for (const lead of leadRows) {
      const leadId = String(lead.id); const events = eventsByLead.get(leadId) ?? []; const leadSessions = sessionsByLead.get(leadId) ?? []; const leadConversations = conversationsByLead.get(leadId) ?? [];
      touchpoints.push({ source_key: `lead:${leadId}:created`, lead_id: leadId, channel: "crm", event_name: "lead_created", campaign_id: lead.meta_campaign_id, adset_id: lead.meta_adset_id, ad_id: lead.meta_ad_id, session_id: lead.web_session_id, occurred_at: lead.created_at, metadata: { source: lead.canal_origen, campaign: lead.campana_origen } });
      for (const event of events) touchpoints.push({ source_key: `web:${event.event_id}`, lead_id: leadId, channel: "web", event_name: event.event_name, campaign_id: lead.meta_campaign_id, adset_id: lead.meta_adset_id, ad_id: lead.meta_ad_id, session_id: event.session_id, occurred_at: event.occurred_at, metadata: { path: event.path, properties: event.properties || {} } });
      for (const conversation of leadConversations) touchpoints.push({ source_key: `whatsapp:${conversation.id}:opened`, lead_id: leadId, channel: "whatsapp", event_name: "conversation_opened", campaign_id: lead.meta_campaign_id, adset_id: lead.meta_adset_id, ad_id: lead.meta_ad_id, session_id: lead.web_session_id, occurred_at: conversation.first_message_at || lead.created_at, metadata: { status: conversation.status, messages: conversation.message_count || 0 } });

      const positive: string[] = []; const missing: string[] = [];
      const email = String(lead.contacto_email || ""); const emailDomain = email.includes("@") ? email.split("@").pop()!.toLowerCase() : "";
      let fit = 0;
      if (lead.empresa && String(lead.empresa).toLowerCase() !== String(lead.contacto_1_nombre || "").toLowerCase()) { fit += 22; positive.push("empresa identificada"); } else missing.push("empresa");
      if (lead.rubro) { fit += 15; positive.push("rubro identificado"); } else missing.push("rubro");
      if (email && !freeEmailDomains.has(emailDomain)) { fit += 18; positive.push("email corporativo"); }
      if (lead.contacto_1_tel) { fit += 10; positive.push("teléfono disponible"); } else missing.push("teléfono");
      if (lead.web) fit += 8; else missing.push("sitio web");
      if (lead.presupuesto_estimado || lead.valor_estimado || lead.monto_propuesto_desarrollo) { fit += 17; positive.push("valor o presupuesto registrado"); } else missing.push("presupuesto");
      const notes = `${lead.contexto || ""} ${lead.mensaje_inicial || ""} ${lead.notas || ""}`.toLowerCase();
      if (/director|dueñ|owner|ceo|fundador|gerente|socio/.test(notes)) { fit += 10; positive.push("posible decisor"); }

      let engagement = 0;
      engagement += Math.min(20, events.filter((event) => event.event_name === "page_view").length * 4);
      if (leadSessions.some((session) => session.engaged)) { engagement += 20; positive.push("sesión web comprometida"); }
      const highIntent = events.filter((event) => highIntentEvents.has(String(event.event_name))).length;
      engagement += Math.min(35, highIntent * 12);
      if (leadConversations.length) { engagement += 25; positive.push("conversación por WhatsApp"); }
      if (highIntent) positive.push("acción digital de alta intención");

      const intent = stageIntent[String(lead.etapa)] ?? 10;
      if (intent >= 52) positive.push("calificación comercial avanzada");
      const score = clamp(clamp(fit) * 0.42 + clamp(intent) * 0.38 + clamp(engagement) * 0.20);
      const completenessChecks = [lead.empresa, lead.rubro, lead.ubicacion, lead.contacto_1_nombre, lead.contacto_1_tel, lead.contacto_email, lead.web, lead.contexto || lead.mensaje_inicial, lead.presupuesto_estimado || lead.valor_estimado, lead.canal_origen];
      const completeness = clamp(completenessChecks.filter(Boolean).length / completenessChecks.length * 100);
      const tier = score >= 75 ? "A" : score >= 55 ? "B" : score >= 32 ? "C" : "D";
      const eligible = Boolean(lead.consentimiento_marketing) && score >= 65 && lead.etapa !== "descartado";
      const times = [lead.created_at, ...events.map((event) => event.occurred_at), ...leadConversations.flatMap((conversation) => [conversation.first_message_at, conversation.last_message_at])].filter(Boolean).map(String).sort();
      const channels = ["crm", ...(events.length ? ["web"] : []), ...(leadConversations.length ? ["whatsapp"] : []), ...(lead.canal_origen === "meta_ads" ? ["meta"] : [])];
      profiles.push({ lead_id: leadId, score, fit_score: clamp(fit), intent_score: clamp(intent), engagement_score: clamp(engagement), data_completeness: completeness, icp_tier: tier, lifecycle_stage: lead.etapa, first_touch_channel: channels[0], last_touch_channel: channels[channels.length - 1], touchpoint_count: 1 + events.length + leadConversations.length, first_touch_at: times[0] || lead.created_at, last_touch_at: times[times.length - 1] || lead.updated_at || lead.created_at, next_best_action: nextAction(String(lead.etapa), missing, score), audience_eligible: eligible, audience_sync_status: eligible ? "eligible" : "not_eligible", positive_signals: [...new Set(positive)], missing_data: [...new Set(missing)], traits: { source: lead.canal_origen, campaign: lead.campana_origen, industry: lead.rubro, location: lead.ubicacion, landingUrl: lead.landing_url, emailDomain: emailDomain || null }, calculated_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }

    if (touchpoints.length) { const { error } = await db.from("marketing_touchpoints").upsert(touchpoints, { onConflict: "source_key" }); if (error) throw error; }
    if (profiles.length) { const { error } = await db.from("lead_marketing_profiles").upsert(profiles, { onConflict: "lead_id" }); if (error) throw error; }
    const audienceEligible = profiles.filter((profile) => profile.audience_eligible).length;
    const summary = { profiles: profiles.length, touchpoints: touchpoints.length, audienceEligible };
    await db.from("marketing_intelligence_runs").update({ status: "success", profiles_processed: profiles.length, touchpoints_processed: touchpoints.length, audience_eligible: audienceEligible, finished_at: new Date().toISOString(), summary }).eq("id", run.id);
    return summary;
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "No se pudo recalcular la inteligencia de marketing.";
    await db.from("marketing_intelligence_runs").update({ status: "error", error_message: message, finished_at: new Date().toISOString() }).eq("id", run.id);
    throw cause;
  }
}

export async function getMarketingIntelligenceOverview(): Promise<MarketingIntelligenceOverview> {
  const db = createUntypedAdminClient();
  const [{ data: profileRows, error: profilesError }, { data: touchpointRows, error: touchpointsError }, { data: runRows, error: runsError }] = await Promise.all([
    db.from("lead_marketing_profiles").select("*").order("score", { ascending: false }),
    db.from("marketing_touchpoints").select("lead_id,channel,occurred_at"),
    db.from("marketing_intelligence_runs").select("*").order("started_at", { ascending: false }).limit(30)
  ]);
  if (profilesError) throw profilesError; if (touchpointsError) throw touchpointsError; if (runsError) throw runsError;
  const profiles = profileRows ?? []; const leadIds = profiles.map((profile) => profile.lead_id);
  const { data: leads, error: leadsError } = leadIds.length
    ? await db.from("leads").select("id,contacto_1_nombre,empresa,rubro,etapa,canal_origen,campana_origen").in("id", leadIds)
    : { data: [], error: null };
  if (leadsError) throw leadsError;
  const leadById = new Map((leads ?? []).map((lead) => [lead.id, lead]));
  const qualified = (leads ?? []).filter((lead) => ["calificado", "diagnostico_ofrecido", "diagnostico_pagado", "cotizacion", "ganado"].includes(String(lead.etapa)));
  const won = (leads ?? []).filter((lead) => lead.etapa === "ganado");
  const learningSample = won.length >= 3 ? won : qualified;
  const signalCounts = new Map<string, number>();
  for (const profile of profiles.filter((row) => learningSample.some((lead) => lead.id === row.lead_id))) for (const signal of stringArray(profile.positive_signals)) signalCounts.set(signal, (signalCounts.get(signal) ?? 0) + 1);
  const winningSignals = [...signalCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([signal]) => signal);
  const confidence = learningSample.length >= 15 ? "high" : learningSample.length >= 5 ? "medium" : "low";
  const topIndustries = frequency(learningSample.map((lead) => lead.rubro)); const topSources = frequency(learningSample.map((lead) => lead.canal_origen)); const topCampaigns = frequency(learningSample.map((lead) => lead.campana_origen));
  const industryText = topIndustries[0]?.value ? `en ${topIndustries[0].value}` : "con un problema operativo claro";
  const sourceText = topSources[0]?.value ? `, que llega por ${topSources[0].value}` : "";
  const narrative = learningSample.length ? `El patrón más prometedor hoy es una empresa ${industryText}${sourceText}, con decisor identificable, intención explícita y disposición a avanzar a diagnóstico. El modelo se recalcula con cada avance o descarte.` : "Todavía no hay suficientes leads calificados para afirmar un ICP. El sistema ya está capturando señales y aumentará su confianza con cada resultado comercial.";

  const channelMap = new Map<string, { channel: string; touchpoints: number; leads: Set<string> }>();
  for (const touchpoint of touchpointRows ?? []) { const channel = String(touchpoint.channel); const current = channelMap.get(channel) ?? { channel, touchpoints: 0, leads: new Set<string>() }; current.touchpoints += 1; current.leads.add(String(touchpoint.lead_id)); channelMap.set(channel, current); }
  const trendMap = new Map<string, { date: string; profiled: number; tierA: number; eligible: number }>();
  for (const profile of profiles) { const date = String(profile.calculated_at).slice(0, 10); const current = trendMap.get(date) ?? { date, profiled: 0, tierA: 0, eligible: 0 }; current.profiled += 1; if (profile.icp_tier === "A") current.tierA += 1; if (profile.audience_eligible) current.eligible += 1; trendMap.set(date, current); }
  const lastRun = (runRows ?? [])[0] || null;
  return {
    summary: { profiledLeads: profiles.length, tierA: profiles.filter((profile) => profile.icp_tier === "A").length, tierB: profiles.filter((profile) => profile.icp_tier === "B").length, audienceEligible: profiles.filter((profile) => profile.audience_eligible).length, averageScore: profiles.length ? profiles.reduce((sum, profile) => sum + n(profile.score), 0) / profiles.length : 0, averageCompleteness: profiles.length ? profiles.reduce((sum, profile) => sum + n(profile.data_completeness), 0) / profiles.length : 0, qualifiedRate: ratio(qualified.length, profiles.length), wonRate: ratio(won.length, profiles.length) },
    idealCustomer: { confidence, sampleSize: learningSample.length, topIndustries, topSources, topCampaigns, winningSignals, narrative },
    profiles: profiles.slice(0, 50).map((profile) => { const lead = leadById.get(profile.lead_id); return { leadId: profile.lead_id, name: lead?.contacto_1_nombre || "Sin nombre", company: lead?.empresa || "Sin empresa", stage: lead?.etapa || profile.lifecycle_stage, source: lead?.canal_origen || null, campaign: lead?.campana_origen || null, score: n(profile.score), fitScore: n(profile.fit_score), intentScore: n(profile.intent_score), engagementScore: n(profile.engagement_score), completeness: n(profile.data_completeness), tier: profile.icp_tier, touchpoints: n(profile.touchpoint_count), lastTouchAt: profile.last_touch_at, nextBestAction: profile.next_best_action, audienceEligible: Boolean(profile.audience_eligible), audienceStatus: profile.audience_sync_status, positiveSignals: stringArray(profile.positive_signals), missingData: stringArray(profile.missing_data) }; }),
    channels: [...channelMap.values()].map((item) => ({ channel: item.channel, touchpoints: item.touchpoints, leads: item.leads.size })).sort((a, b) => b.touchpoints - a.touchpoints),
    learningTrend: [...trendMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
    lastRun: lastRun ? { status: lastRun.status, triggerType: lastRun.trigger_type, startedAt: lastRun.started_at, finishedAt: lastRun.finished_at, profilesProcessed: n(lastRun.profiles_processed), errorMessage: lastRun.error_message } : null
  };
}
