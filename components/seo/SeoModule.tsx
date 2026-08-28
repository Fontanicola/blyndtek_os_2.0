"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
  Input,
} from "@/components/ui";
import {
  AlertTriangleIcon,
  BarChartIcon,
  CheckCircleIcon,
  GlobeIcon,
  SparklesIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";

type Tab = "resumen" | "consultas" | "paginas" | "competidores" | "ia" | "acciones" | "alertas";

const tabs: Array<{ value: Tab; label: string }> = [
  { value: "resumen", label: "Resumen" },
  { value: "consultas", label: "Consultas" },
  { value: "paginas", label: "Páginas" },
  { value: "competidores", label: "Competidores" },
  { value: "ia", label: "Visibilidad en IA" },
  { value: "acciones", label: "Acciones" },
  { value: "alertas", label: "Alertas" },
];

const queries = [
  ["software a medida para empresas", "Software a medida", "/sistemas-a-medida/", "Crítica", "Sin medición"],
  ["automatización de procesos para empresas", "Automatización", "/automatizacion-de-procesos/", "Crítica", "Sin medición"],
  ["desarrollo de sistemas a medida", "Software a medida", "/sistemas-a-medida/", "Alta", "Sin medición"],
  ["inteligencia artificial para empresas", "IA empresarial", "/inteligencia-artificial-para-empresas/", "Crítica", "Sin medición"],
  ["diagnóstico operativo", "Diagnóstico", "/diagnostico-operativo/", "Crítica", "Sin medición"],
  ["automatización de tareas administrativas", "Automatización", "/automatizacion-de-procesos/", "Alta", "Sin medición"],
  ["cómo saber qué proceso automatizar", "Automatización", "/la-operacion/automatizar-despues-de-medir/", "Alta", "Sin medición"],
  ["cómo dejar de usar Excel para gestionar una empresa", "Problemas", "/la-operacion/cuando-una-planilla-deja-de-alcanzar/", "Alta", "Sin medición"],
  ["integración de sistemas empresariales", "Integraciones", "Página pendiente", "Alta", "Sin medición"],
  ["software estándar vs software a medida", "Comparativas", "Brief pendiente", "Alta", "Sin medición"],
] as const;

const pages = [
  ["/", "200 · index", "Marca + categoría", "15", "Revisar CTR al conectar GSC"],
  ["/sistemas-a-medida/", "200 · index", "Software a medida", "3", "Reforzar prueba y enlaces"],
  ["/automatizacion-de-procesos/", "200 · index", "Automatización", "3", "Solicitar indexación"],
  ["/inteligencia-artificial-para-empresas/", "200 · index", "IA empresarial", "3", "Solicitar indexación"],
  ["/diagnostico-operativo/", "200 · index", "Diagnóstico", "14", "Confirmar conversión"],
  ["/la-operacion/", "200 · index", "Autoridad editorial", "16", "Medir suscripciones"],
] as const;

const competitors = [
  ["arquitechnia.com", "Software a medida", "Página específica y copy comercial"],
  ["nolo.ar", "Software a medida", "Sistemas demostrables por categoría"],
  ["contarg.com", "Software a medida", "Página localizada para Argentina"],
  ["intway.com.ar", "Software para Pymes", "Contenido de comparación y soporte"],
  ["dinestra.com", "Gestión e IA", "Propuesta combinada de software e integraciones"],
  ["caudal.ar", "Software + IA", "Foco explícito en Pymes argentinas"],
] as const;

const actions = [
  ["Validar primeros datos de GSC, GA4 y Bing", "Alto", "Baja", "SEO", "Programada a 48 h"],
  ["Medir lead y newsletter_subscribe en GA4", "Alto", "Baja", "SEO", "Eventos clave configurados"],
  ["Publicar política de crawlers", "Alto", "Baja", "SEO", "Implementada en código"],
  ["Solicitar indexación de páginas comerciales", "Alto", "Baja", "SEO", "GSC conectado"],
  ["Reforzar enlaces a casos y artículos", "Medio", "Media", "Editorial", "Sugerida"],
] as const;

type LiveSource = { source_key: string; label: string; status: string; last_sync_at: string | null; last_error: string | null };
type LivePrompt = { id: string; prompt: string; cluster: string; country: string; language: string };
type LiveAiRun = {
  id: string;
  prompt_id: string;
  engine: string;
  engine_mode: string | null;
  run_at: string;
  mentions_blyndtek: boolean;
  prominence: string | null;
  evidence_url: string | null;
  competitors: unknown;
  response_text: string | null;
};

type LiveSnapshot = {
  snapshot_date: string;
  clicks: number | null;
  impressions: number | null;
  ctr: number | null;
  average_position: number | null;
  conversions: number | null;
  metadata: Record<string, unknown>;
};

type SeoModuleProps = {
  liveData: { sources: LiveSource[]; prompts: LivePrompt[]; aiRuns: LiveAiRun[]; snapshot: LiveSnapshot | null };
};

function formatSnapshotDate(value: string | null | undefined) {
  if (!value) return "sin fecha";
  const [year, month, day] = value.split("-");
  const monthLabel = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"][Number(month) - 1];
  return monthLabel ? `${Number(day)} ${monthLabel} ${year}` : value;
}

function metadataString(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : null;
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <Card padding="md">
      <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-carbon">{value}</p>
      <p className="mt-2 text-xs leading-5 text-graphite">{note}</p>
    </Card>
  );
}

function SectionTitle({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
      <h2 className="text-lg font-label text-carbon">{children}</h2>
      {note ? <p className="text-xs text-graphite">{note}</p> : null}
    </div>
  );
}

export function SeoModule({ liveData }: SeoModuleProps) {
  const [tab, setTab] = useState<Tab>("resumen");
  const [querySearch, setQuerySearch] = useState("");
  const latestRunAt = liveData.aiRuns[0]?.run_at ?? null;
  const latestRuns = latestRunAt ? liveData.aiRuns.filter((run) => run.run_at === latestRunAt) : [];
  const mentionCount = latestRuns.filter((run) => run.mentions_blyndtek).length;
  const engineCount = new Set(latestRuns.map((run) => run.engine)).size;
  const snapshot = liveData.snapshot;
  const snapshotDate = formatSnapshotDate(snapshot?.snapshot_date);
  const gscDataDate = metadataString(snapshot?.metadata, "gsc_data_date");
  const gscDateNote = gscDataDate ? `Datos de Search Console del ${formatSnapshotDate(gscDataDate)}` : "Última medición disponible";
  const hasOrganicSignal = snapshot?.clicks != null && snapshot?.impressions != null;
  const organicAttributionAvailable = metadataString(snapshot?.metadata, "ga4_organic_attribution") !== "not_yet_available";
  const sourceByKey = new Map(liveData.sources.map((source) => [source.source_key, source]));
  const gscConnected = sourceByKey.get("google_search_console")?.status === "connected";
  const ga4Connected = sourceByKey.get("ga4")?.status === "connected";
  const bingConnected = sourceByKey.get("bing_webmaster")?.status === "connected";
  const criticalSourceCount = ["google_search_console", "ga4", "bing_webmaster"].filter((key) => {
    const status = sourceByKey.get(key)?.status;
    return status === "error" || status === "not_configured" || !status;
  }).length;
  const promptById = new Map(liveData.prompts.map((prompt) => [prompt.id, prompt]));
  const sourceRows = liveData.sources.map((source) => {
    const variant = source.status === "connected" ? "success" : source.status === "error" || source.status === "not_configured" ? "danger" : "warning";
    const status = source.status === "connected" ? "Conectado" : source.status === "partial" ? "Parcial" : source.status === "error" ? "Error" : "Sin configurar";
    return [source.label, status, variant] as const;
  });
  const filteredQueries = useMemo(
    () => queries.filter((row) => row.join(" ").toLowerCase().includes(querySearch.toLowerCase())),
    [querySearch],
  );

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line-soft bg-white p-3">
        <div className="flex flex-wrap gap-1">
          {tabs.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setTab(item.value)}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-label transition-colors",
                tab === item.value ? "bg-signal text-white" : "text-graphite hover:bg-paper hover:text-carbon",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-graphite">
          <Badge variant="warning">Medición parcial</Badge>
          <span>Base {snapshotDate}</span>
        </div>
      </div>

      {tab === "resumen" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Clics orgánicos" value={snapshot?.clicks == null ? "—" : String(snapshot.clicks)} note={hasOrganicSignal ? gscDateNote : gscConnected ? "Search Console conectado · datos iniciales en procesamiento" : "Search Console sin acceso"} />
            <Metric label="Impresiones" value={snapshot?.impressions == null ? "—" : String(snapshot.impressions)} note={hasOrganicSignal ? gscDateNote : "No se interpreta como cero"} />
            <Metric label="URLs técnicas válidas" value="32/32" note="Status, canonical, H1 y robots correctos" />
            <Metric label="Lighthouse móvil" value="88" note="LCP 3,9 s · SEO 100 · A11y 100 · producción" />
            <Metric label="Top 3 / 5 / 10 / 20" value="—" note="Requiere contexto de país y dispositivo" />
            <Metric label="Conversiones orgánicas" value={snapshot?.conversions != null && organicAttributionAvailable ? String(snapshot.conversions) : "—"} note={snapshot?.conversions != null && !organicAttributionAvailable ? `GA4 registró ${snapshot.conversions} eventos clave totales; la atribución orgánica aún no está disponible` : ga4Connected ? "GA4 conectado · lead y suscripción configurados como eventos clave" : "GA4 y tracking pendientes"} />
            <Metric label="Menciones en IA" value={latestRuns.length ? `${mentionCount}/${latestRuns.length}` : "—"} note={latestRuns.length ? `${engineCount} motores · ${liveData.prompts.length} prompts · Argentina` : "Primera ronda de control pendiente"} />
            <Metric label="Alertas críticas" value={String(criticalSourceCount)} note={criticalSourceCount ? "Hay fuentes prioritarias sin conexión verificable" : "GSC, GA4 y Bing conectados; datos iniciales en procesamiento"} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card padding="lg">
              <SectionTitle note={hasOrganicSignal ? gscDateNote : "No se grafican ceros artificiales"}>Evolución orgánica</SectionTitle>
              <div className="flex min-h-[240px] flex-col items-center justify-center rounded-md border border-dashed border-line bg-paper/45 px-6 text-center">
                <BarChartIcon className="text-graphite/50" size={36} />
                <p className="mt-3 font-label text-carbon">{hasOrganicSignal ? "Primera señal oficial disponible" : "Histórico inicial en procesamiento"}</p>
                <p className="mt-2 max-w-md text-sm leading-6 text-graphite">{hasOrganicSignal ? `${snapshot.clicks} clics · ${snapshot.impressions} impresiones · ${snapshot.ctr ?? 0}% CTR · posición media ${snapshot.average_position ?? "—"}. Todavía no hay volumen suficiente para interpretar tendencia.` : "Search Console ya está conectado. Cuando complete su procesamiento se mostrarán clics, impresiones, CTR, posiciones y rangos comparables."}</p>
              </div>
            </Card>
            <Card padding="lg">
              <SectionTitle>Salud de integraciones</SectionTitle>
              <div className="divide-y divide-line-soft">
                {sourceRows.map(([label, status, variant]) => (
                  <div key={label} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="text-sm text-carbon">{label}</span>
                    <Badge variant={variant}>{status}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      ) : null}

      {tab === "consultas" ? (
        <Card padding="lg">
          <SectionTitle note={`${filteredQueries.length} consultas visibles`}>Monitor de consultas</SectionTitle>
          <div className="mb-4 max-w-md"><Input value={querySearch} onChange={(event) => setQuerySearch(event.target.value)} placeholder="Buscar consulta, cluster o URL" /></div>
          <DataTable>
            <DataTableHeader><DataTableRow><DataTableHead>Consulta</DataTableHead><DataTableHead>Cluster</DataTableHead><DataTableHead>Página objetivo</DataTableHead><DataTableHead>Prioridad</DataTableHead><DataTableHead>Posición</DataTableHead></DataTableRow></DataTableHeader>
            <DataTableBody>{filteredQueries.map((row) => <DataTableRow key={row[0]}>{row.map((cell, index) => <DataTableCell key={`${row[0]}-${cell}`} className={index === 0 ? "min-w-[280px] font-medium text-carbon" : "min-w-[150px]"}>{index === 3 ? <Badge variant={cell === "Crítica" ? "danger" : "warning"}>{cell}</Badge> : cell}</DataTableCell>)}</DataTableRow>)}</DataTableBody>
          </DataTable>
        </Card>
      ) : null}

      {tab === "paginas" ? (
        <Card padding="lg">
          <SectionTitle note="Muestra inicial del sitemap">Páginas y contenido</SectionTitle>
          <DataTable><DataTableHeader><DataTableRow><DataTableHead>URL</DataTableHead><DataTableHead>Indexación técnica</DataTableHead><DataTableHead>Función</DataTableHead><DataTableHead>Imágenes</DataTableHead><DataTableHead>Acción</DataTableHead></DataTableRow></DataTableHeader><DataTableBody>{pages.map((row) => <DataTableRow key={row[0]}>{row.map((cell, index) => <DataTableCell key={`${row[0]}-${cell}`} className={index === 0 ? "font-medium text-carbon" : "min-w-[150px]"}>{cell}</DataTableCell>)}</DataTableRow>)}</DataTableBody></DataTable>
        </Card>
      ) : null}

      {tab === "competidores" ? (
        <Card padding="lg">
          <SectionTitle note="Observación de SERP; falta histórico">Competidores orgánicos</SectionTitle>
          <DataTable><DataTableHeader><DataTableRow><DataTableHead>Dominio</DataTableHead><DataTableHead>Cluster</DataTableHead><DataTableHead>Señal observada</DataTableHead></DataTableRow></DataTableHeader><DataTableBody>{competitors.map((row) => <DataTableRow key={row[0]}>{row.map((cell, index) => <DataTableCell key={`${row[0]}-${cell}`} className={index === 0 ? "font-medium text-carbon" : "min-w-[220px]"}>{cell}</DataTableCell>)}</DataTableRow>)}</DataTableBody></DataTable>
        </Card>
      ) : null}

      {tab === "ia" ? (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1fr_0.72fr]">
          <Card padding="lg">
            <SectionTitle note={`${liveData.prompts.length} prompts · Argentina · español`}>Prompts de control</SectionTitle>
            <ol className="divide-y divide-line-soft">{liveData.prompts.map((prompt, index) => {
              const promptRuns = latestRuns.filter((run) => run.prompt_id === prompt.id);
              const promptMentions = promptRuns.filter((run) => run.mentions_blyndtek).length;
              return <li key={prompt.id} className="grid grid-cols-[2rem_1fr_auto] gap-3 py-4 first:pt-0 last:pb-0"><span className="text-xs font-label text-signal">{String(index + 1).padStart(2, "0")}</span><p className="text-sm leading-6 text-carbon">{prompt.prompt}</p><Badge variant={promptMentions ? "success" : "warning"}>{promptRuns.length ? `${promptMentions}/${promptRuns.length}` : "Sin ejecutar"}</Badge></li>;
            })}</ol>
          </Card>
          <Card padding="lg">
            <SectionTitle>Principio de medición</SectionTitle>
            <SparklesIcon className="text-signal" size={34} />
            <p className="mt-4 text-sm leading-6 text-graphite">Cada ejecución guarda motor, modalidad, contexto, respuesta, mención, prominencia, cita, competidores, exactitud y evidencia. Una sola respuesta no se interpreta como tendencia.</p>
            {latestRunAt ? <p className="mt-4 text-sm font-medium text-carbon">Última ronda: {new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(latestRunAt))}</p> : null}
            <Button className="mt-5" disabled>Ejecutar ronda</Button>
          </Card>
          </div>
          <Card padding="lg">
            <SectionTitle note={`${latestRuns.length} respuestas con evidencia`}>Resultados de la última ronda</SectionTitle>
            <DataTable><DataTableHeader><DataTableRow><DataTableHead>Motor</DataTableHead><DataTableHead>Prompt</DataTableHead><DataTableHead>Mención</DataTableHead><DataTableHead>Observación</DataTableHead><DataTableHead>Evidencia</DataTableHead></DataTableRow></DataTableHeader><DataTableBody>{latestRuns.map((run) => {
              const prompt = promptById.get(run.prompt_id);
              return <DataTableRow key={run.id}><DataTableCell className="min-w-[150px] font-medium text-carbon">{run.engine}</DataTableCell><DataTableCell className="min-w-[300px]">{prompt?.prompt ?? "Prompt eliminado"}</DataTableCell><DataTableCell><Badge variant={run.mentions_blyndtek ? "success" : "warning"}>{run.mentions_blyndtek ? "Sí" : "No"}</Badge></DataTableCell><DataTableCell className="min-w-[260px]">{run.response_text ?? "Sin resumen"}</DataTableCell><DataTableCell>{run.evidence_url ? <a className="font-medium text-signal hover:underline" href={run.evidence_url} target="_blank" rel="noreferrer">Abrir</a> : "—"}</DataTableCell></DataTableRow>;
            })}</DataTableBody></DataTable>
          </Card>
        </div>
      ) : null}

      {tab === "acciones" ? (
        <Card padding="lg">
          <SectionTitle>Cola priorizada</SectionTitle>
          <DataTable><DataTableHeader><DataTableRow><DataTableHead>Problema / acción</DataTableHead><DataTableHead>Impacto</DataTableHead><DataTableHead>Esfuerzo</DataTableHead><DataTableHead>Responsable</DataTableHead><DataTableHead>Estado</DataTableHead></DataTableRow></DataTableHeader><DataTableBody>{actions.map((row) => <DataTableRow key={row[0]}>{row.map((cell, index) => <DataTableCell key={`${row[0]}-${cell}`} className={index === 0 ? "min-w-[280px] font-medium text-carbon" : "min-w-[130px]"}>{index === 1 ? <Badge variant={cell === "Alto" ? "warning" : "default"}>{cell}</Badge> : cell}</DataTableCell>)}</DataTableRow>)}</DataTableBody></DataTable>
        </Card>
      ) : null}

      {tab === "alertas" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card padding="lg" className={gscConnected ? "border-success/25" : "border-warning/25"}><div className="flex gap-3">{gscConnected ? <CheckCircleIcon className="mt-0.5 text-success" /> : <AlertTriangleIcon className="mt-0.5 text-warning" />}<div><Badge variant={gscConnected ? "success" : "warning"}>{gscConnected ? "Conectado" : "Pendiente"}</Badge><h2 className="mt-3 font-label text-carbon">Google Search Console</h2><p className="mt-2 text-sm leading-6 text-graphite">{gscConnected ? "Propiedad verificada y sitemap correcto; el informe de rendimiento está en procesamiento inicial." : "La propiedad todavía no tiene una conexión verificable."}</p></div></div></Card>
          <Card padding="lg" className={ga4Connected ? "border-success/25" : "border-danger/25"}><div className="flex gap-3">{ga4Connected ? <CheckCircleIcon className="mt-0.5 text-success" /> : <AlertTriangleIcon className="mt-0.5 text-danger" />}<div><Badge variant={ga4Connected ? "success" : "danger"}>{ga4Connected ? "Conectado" : "Crítica"}</Badge><h2 className="mt-3 font-label text-carbon">Google Analytics 4</h2><p className="mt-2 text-sm leading-6 text-graphite">{ga4Connected ? "Propiedad, flujo web y eventos clave configurados; falta completar la ventana inicial de recepción." : "No existe evidencia accesible de sesiones o conversiones del dominio."}</p></div></div></Card>
          <Card padding="lg" className={bingConnected ? "border-success/25" : undefined}><div className="flex gap-3">{bingConnected ? <CheckCircleIcon className="mt-0.5 text-success" /> : <GlobeIcon className="mt-0.5 text-warning" />}<div><Badge variant={bingConnected ? "success" : "warning"}>{bingConnected ? "Conectado" : "Advertencia"}</Badge><h2 className="mt-3 font-label text-carbon">Bing Webmaster Tools</h2><p className="mt-2 text-sm leading-6 text-graphite">{bingConnected ? "Sitio y sitemap importados desde GSC; Bing está procesando el rastreo inicial." : "No se pueden leer consultas, backlinks ni estado del sitemap."}</p></div></div></Card>
          <Card padding="lg"><div className="flex gap-3"><CheckCircleIcon className="mt-0.5 text-success" /><div><Badge variant="success">Correcto</Badge><h2 className="mt-3 font-label text-carbon">Base técnica pública sana</h2><p className="mt-2 text-sm leading-6 text-graphite">32 URLs verificadas sin status, canonical, H1, alt text o enlaces rotos detectados.</p></div></div></Card>
        </div>
      ) : null}
    </div>
  );
}
