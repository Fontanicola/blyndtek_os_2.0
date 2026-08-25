import { NextResponse } from "next/server";
import { getTechOpsClient } from "@/lib/observability/tech-ops";
import { getAdminUser } from "@/lib/require-admin";

function percentile95(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)];
}

function average(values: number[]) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
}

export async function GET(request: Request) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const client = getTechOpsClient();
  const sistemaId = new URL(request.url).searchParams.get("sistema_id");
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [systemsResult, incidentsResult, eventsResult, integrationsResult, remediationsResult, guardsResult, actionsResult, checksResult, deploysResult, slosResult] = await Promise.all([
    client.from("sistemas_gestionados").select("id,nombre,url_produccion,estado,monitoreo_activo,vercel_project_id,repositorio_github").order("nombre"),
    client.from("sistemas_incidentes").select("*").gte("created_at", since30d).order("ultima_ocurrencia_at", { ascending: false }).limit(500),
    client.from("sistemas_eventos_tecnicos").select("*").gte("ocurrido_at", since24h).order("ocurrido_at", { ascending: false }).limit(2000),
    client.from("sistemas_integraciones").select("*"),
    client.from("sistemas_remediaciones").select("*").order("created_at", { ascending: false }).limit(50),
    client.from("sistemas_guardias").select("*").order("iniciada_at", { ascending: false }).limit(50),
    client.from("sistemas_acciones_tecnicas").select("*").order("created_at", { ascending: false }).limit(150),
    client.from("sistemas_health_checks").select("*").gte("checked_at", since30d).order("checked_at", { ascending: false }).limit(5000),
    client.from("sistemas_deploys").select("*").gte("created_at", since30d).order("created_at", { ascending: false }).limit(2000),
    client.from("sistemas_slos").select("*")
  ]);
  const firstError = systemsResult.error ?? incidentsResult.error ?? eventsResult.error ?? integrationsResult.error ?? remediationsResult.error ?? guardsResult.error ?? actionsResult.error ?? checksResult.error ?? deploysResult.error ?? slosResult.error;
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

  const allSystems = systemsResult.data ?? [];
  const systems = sistemaId ? allSystems.filter((row) => row.id === sistemaId) : allSystems;
  const allowedIds = new Set(systems.map((row) => row.id));
  const incidents = (incidentsResult.data ?? []).filter((row) => allowedIds.has(row.sistema_id));
  const openIncidents = incidents.filter((row) => !row.resuelto);
  const events = (eventsResult.data ?? []).filter((row) => !row.sistema_id || allowedIds.has(row.sistema_id));
  const integrations = (integrationsResult.data ?? []).filter((row) => allowedIds.has(row.sistema_id));
  const actions = (actionsResult.data ?? []).filter((row) => !row.sistema_id || allowedIds.has(row.sistema_id));
  const checks = (checksResult.data ?? []).filter((row) => allowedIds.has(row.sistema_id));
  const deploys = (deploysResult.data ?? []).filter((row) => allowedIds.has(row.sistema_id));
  const slos = (slosResult.data ?? []).filter((row) => allowedIds.has(row.sistema_id));
  const guards = guardsResult.data ?? [];
  const names = new Map(allSystems.map((row) => [row.id, row.nombre]));
  const guardById = new Map(guards.map((guard) => [guard.id, guard]));

  const systemSummaries = systems.map((system) => {
    const systemChecks = checks.filter((row) => row.sistema_id === system.id);
    const latestCheck = systemChecks[0] ?? null;
    const systemEvents = events.filter((row) => row.sistema_id === system.id);
    const errorEvents = systemEvents.filter((row) => row.nivel === "error" || row.nivel === "fatal");
    const systemIncidents = openIncidents.filter((row) => row.sistema_id === system.id);
    const systemDeploys = deploys.filter((row) => row.sistema_id === system.id);
    const latestDeploy = systemDeploys[0] ?? null;
    const systemIntegrations = integrations.filter((row) => row.sistema_id === system.id);
    const systemActions = actions.filter((row) => row.sistema_id === system.id);
    const latestAction = systemActions[0] ?? null;
    const latestGuard = latestAction?.guardia_id ? guardById.get(latestAction.guardia_id) ?? guards[0] ?? null : guards[0] ?? null;
    const p95 = percentile95(systemChecks.map((row) => row.latencia_ms).filter((value): value is number => typeof value === "number"));
    const availability = systemChecks.length ? Math.round((systemChecks.filter((row) => row.estado === "ok").length / systemChecks.length) * 10000) / 100 : null;
    const hasPriorityIncident = systemIncidents.some((row) => row.severidad === "critica" || row.severidad === "alta");
    const latestDeployFailed = latestDeploy?.estado === "ERROR" || latestDeploy?.estado === "CANCELED";
    const operationalStatus = latestCheck?.estado === "caido" || latestDeployFailed ? "caido" : latestCheck?.estado === "degradado" || hasPriorityIncident ? "degradado" : latestCheck?.estado === "ok" ? "ok" : "sin_datos";
    return {
      ...system,
      estado_operativo: operationalStatus,
      ultimo_check: latestCheck,
      ultimo_evento_at: systemEvents[0]?.ocurrido_at ?? null,
      errores_24h: errorEvents.length,
      incidentes_abiertos: systemIncidents.length,
      p0_p1_abiertos: systemIncidents.filter((row) => row.severidad === "critica" || row.severidad === "alta").length,
      latencia_p95_ms: p95,
      disponibilidad_30d: availability,
      ultimo_deploy: latestDeploy,
      deploys_30d: systemDeploys.length,
      deploys_fallidos_30d: systemDeploys.filter((row) => row.estado === "ERROR" || row.estado === "CANCELED").length,
      integraciones_conectadas: systemIntegrations.filter((row) => row.estado === "conectado").length,
      integraciones_totales: systemIntegrations.length,
      ultima_accion: latestAction,
      ultima_guardia: latestGuard,
      slo: slos.find((row) => row.sistema_id === system.id) ?? null
    };
  });

  const providerSummary = new Map<string, { proveedor: string; total: number; conectadas: number; con_error: number }>();
  for (const integration of integrations) {
    const current = providerSummary.get(integration.proveedor) ?? { proveedor: integration.proveedor, total: 0, conectadas: 0, con_error: 0 };
    current.total += 1;
    if (integration.estado === "conectado") current.conectadas += 1;
    if (integration.estado === "error" || integration.estado === "degradado") current.con_error += 1;
    providerSummary.set(integration.proveedor, current);
  }

  const timeline = [
    ...events.slice(0, 80).map((row) => ({ id: `event-${row.id}`, clase: "evento", sistema_id: row.sistema_id, sistema_nombre: row.sistema_id ? names.get(row.sistema_id) ?? "Sistema" : "Flota", estado: row.nivel, titulo: row.mensaje, detalle: `${row.fuente} · ${row.tipo}`, fecha: row.ocurrido_at, url: null })),
    ...actions.slice(0, 60).map((row) => ({ id: `action-${row.id}`, clase: "accion", sistema_id: row.sistema_id, sistema_nombre: row.sistema_id ? names.get(row.sistema_id) ?? "Sistema" : "Flota", estado: row.estado, titulo: row.titulo, detalle: `${row.actor} · ${row.tipo}`, fecha: row.created_at, url: row.external_url })),
    ...deploys.slice(0, 50).map((row) => ({ id: `deploy-${row.id}`, clase: "deploy", sistema_id: row.sistema_id, sistema_nombre: names.get(row.sistema_id) ?? "Sistema", estado: row.estado ?? "UNKNOWN", titulo: row.commit_mensaje ?? "Deploy", detalle: row.commit_sha?.slice(0, 8) ?? "Sin commit", fecha: row.desplegado_at ?? row.created_at, url: null })),
    ...guards.slice(0, 30).map((row) => ({ id: `guard-${row.id}`, clase: "guardia", sistema_id: null, sistema_nombre: "Guardia multiproyecto", estado: row.estado, titulo: row.resumen ?? "Ejecución de guardia técnica", detalle: `${row.sistemas_revisados} sistemas · ${row.incidentes_detectados} hallazgos`, fecha: row.iniciada_at, url: null }))
  ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 100);

  const resolvedDurations = incidents.filter((row) => row.resuelto_at).map((row) => new Date(row.resuelto_at as string).getTime() - new Date(row.primera_ocurrencia_at).getTime()).filter((value) => value >= 0);
  const recentDeploys = deploys.filter((row) => new Date(row.desplegado_at ?? row.created_at).getTime() >= new Date(since24h).getTime());
  const connected = integrations.filter((row) => row.estado === "conectado").length;

  return NextResponse.json({
    data: {
      generated_at: new Date().toISOString(),
      kpis: {
        sistemas_totales: systems.length,
        sistemas_saludables: systemSummaries.filter((row) => row.estado_operativo === "ok").length,
        sistemas_degradados: systemSummaries.filter((row) => row.estado_operativo === "degradado").length,
        sistemas_caidos: systemSummaries.filter((row) => row.estado_operativo === "caido").length,
        sistemas_sin_datos: systemSummaries.filter((row) => row.estado_operativo === "sin_datos").length,
        errores_24h: events.filter((event) => event.nivel === "error" || event.nivel === "fatal").length,
        incidentes_abiertos: openIncidents.length,
        p0_p1_abiertos: openIncidents.filter((incident) => incident.severidad === "critica" || incident.severidad === "alta").length,
        deploys_24h: recentDeploys.length,
        change_failure_rate_30d: deploys.length ? Math.round((deploys.filter((row) => row.estado === "ERROR" || row.estado === "CANCELED").length / deploys.length) * 1000) / 10 : null,
        mttr_minutos_30d: average(resolvedDurations.map((value) => Math.round(value / 60000))),
        latencia_p95_ms: percentile95(checks.map((row) => row.latencia_ms).filter((value): value is number => typeof value === "number")),
        integraciones_conectadas: connected,
        integraciones_totales: integrations.length,
        ultima_guardia_estado: guards[0]?.estado ?? null,
        ultima_guardia_at: guards[0]?.iniciada_at ?? null
      },
      sistemas: systemSummaries,
      incidentes: openIncidents.map((row) => ({ ...row, sistema_nombre: names.get(row.sistema_id) ?? "Sistema sin identificar" })),
      incidentes_recientes: incidents.map((row) => ({ ...row, sistema_nombre: names.get(row.sistema_id) ?? "Sistema sin identificar" })),
      integraciones: Array.from(providerSummary.values()).sort((a, b) => a.proveedor.localeCompare(b.proveedor)),
      integraciones_detalle: integrations,
      guardias: guards,
      acciones: actions.map((row) => ({ ...row, sistema_nombre: row.sistema_id ? names.get(row.sistema_id) ?? "Sistema" : "Flota" })),
      remediaciones: (remediationsResult.data ?? []).filter((row) => allowedIds.has(row.sistema_id)),
      timeline
    }
  });
}
