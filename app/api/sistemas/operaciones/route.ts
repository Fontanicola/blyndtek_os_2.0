import { NextResponse } from "next/server";
import { getTechOpsClient } from "@/lib/observability/tech-ops";
import { getAdminUser } from "@/lib/require-admin";

export async function GET() {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const client = getTechOpsClient();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [systemsResult, incidentsResult, eventsResult, integrationsResult, remediationsResult] = await Promise.all([
    client.from("sistemas_gestionados").select("id,nombre"),
    client.from("sistemas_incidentes").select("*").eq("resuelto", false).order("ultima_ocurrencia_at", { ascending: false }).limit(50),
    client.from("sistemas_eventos_tecnicos").select("id,fuente,nivel,sistema_id,ocurrido_at").gte("ocurrido_at", since24h).limit(2000),
    client.from("sistemas_integraciones").select("*"),
    client.from("sistemas_remediaciones").select("*").order("created_at", { ascending: false }).limit(20)
  ]);
  const firstError = systemsResult.error ?? incidentsResult.error ?? eventsResult.error ?? integrationsResult.error ?? remediationsResult.error;
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

  const names = new Map((systemsResult.data ?? []).map((row) => [row.id, row.nombre]));
  const incidents = (incidentsResult.data ?? []).map((row) => ({ ...row, sistema_nombre: names.get(row.sistema_id) ?? "Sistema sin identificar" }));
  const events = eventsResult.data ?? [];
  const integrations = integrationsResult.data ?? [];
  const providerSummary = new Map<string, { proveedor: string; total: number; conectadas: number; con_error: number }>();
  for (const integration of integrations) {
    const current = providerSummary.get(integration.proveedor) ?? { proveedor: integration.proveedor, total: 0, conectadas: 0, con_error: 0 };
    current.total += 1;
    if (integration.estado === "conectado") current.conectadas += 1;
    if (integration.estado === "error" || integration.estado === "degradado") current.con_error += 1;
    providerSummary.set(integration.proveedor, current);
  }

  return NextResponse.json({
    data: {
      kpis: {
        errores_24h: events.filter((event) => event.nivel === "error" || event.nivel === "fatal").length,
        p0_p1_abiertos: incidents.filter((incident) => incident.severidad === "critica" || incident.severidad === "alta").length,
        sistemas_afectados: new Set(incidents.map((incident) => incident.sistema_id)).size,
        integraciones_conectadas: integrations.filter((integration) => integration.estado === "conectado").length,
        integraciones_totales: integrations.length
      },
      incidentes: incidents,
      integraciones: Array.from(providerSummary.values()).sort((a, b) => a.proveedor.localeCompare(b.proveedor)),
      remediaciones: remediationsResult.data ?? []
    }
  });
}
