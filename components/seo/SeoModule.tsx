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

const prompts = [
  "¿Qué empresas argentinas automatizan procesos para Pymes?",
  "¿Quién desarrolla sistemas a medida para empresas en Argentina?",
  "¿Qué consultora puede diagnosticar procesos antes de desarrollar software?",
  "¿Qué empresa trabaja con agentes de IA aplicados a operaciones?",
  "¿Quién puede integrar WhatsApp, CRM y sistemas internos?",
] as const;

const actions = [
  ["Conectar Search Console", "Crítico", "Alta", "Felipe / Admin", "Pendiente de acceso"],
  ["Crear propiedad y flujo GA4 de Blyndtek", "Crítico", "Media", "Admin", "Pendiente de acceso"],
  ["Publicar política de crawlers", "Alto", "Baja", "SEO", "Implementada en código"],
  ["Solicitar indexación de páginas comerciales", "Alto", "Baja", "SEO", "Bloqueada por GSC"],
  ["Reforzar enlaces a casos y artículos", "Medio", "Media", "Editorial", "Sugerida"],
] as const;

const sources = [
  ["Google Search Console", "Sin acceso", "danger"],
  ["Google Analytics 4", "Sin propiedad Blyndtek", "danger"],
  ["Bing Webmaster Tools", "Sin sesión", "warning"],
  ["Vercel", "Conectado", "success"],
  ["Blyndtek Web", "32 URLs verificadas", "success"],
  ["Buscadores con IA", "Línea de base pendiente", "warning"],
] as const;

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

export function SeoModule() {
  const [tab, setTab] = useState<Tab>("resumen");
  const [querySearch, setQuerySearch] = useState("");
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
          <span>Base 27 ago 2026</span>
        </div>
      </div>

      {tab === "resumen" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Clics orgánicos" value="—" note="Search Console sin acceso" />
            <Metric label="Impresiones" value="—" note="No se interpreta como cero" />
            <Metric label="URLs técnicas válidas" value="32/32" note="Status, canonical, H1 y robots correctos" />
            <Metric label="Lighthouse móvil" value="88" note="LCP 3,9 s · SEO 100 · A11y 100 · producción" />
            <Metric label="Top 3 / 5 / 10 / 20" value="—" note="Requiere contexto de país y dispositivo" />
            <Metric label="Conversiones orgánicas" value="—" note="GA4 y tracking pendientes" />
            <Metric label="Menciones en IA" value="—" note="Primera ronda de control pendiente" />
            <Metric label="Alertas críticas" value="2" note="GSC y GA4 sin conexión verificable" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card padding="lg">
              <SectionTitle note="No se grafican ceros artificiales">Evolución orgánica</SectionTitle>
              <div className="flex min-h-[240px] flex-col items-center justify-center rounded-md border border-dashed border-line bg-paper/45 px-6 text-center">
                <BarChartIcon className="text-graphite/50" size={36} />
                <p className="mt-3 font-label text-carbon">Histórico pendiente de fuente</p>
                <p className="mt-2 max-w-md text-sm leading-6 text-graphite">Al conectar Search Console se mostrarán clics, impresiones, CTR, posiciones y rangos comparables.</p>
              </div>
            </Card>
            <Card padding="lg">
              <SectionTitle>Salud de integraciones</SectionTitle>
              <div className="divide-y divide-line-soft">
                {sources.map(([label, status, variant]) => (
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
        <div className="grid gap-6 xl:grid-cols-[1fr_0.72fr]">
          <Card padding="lg">
            <SectionTitle note="Argentina · español">Prompts de control</SectionTitle>
            <ol className="divide-y divide-line-soft">{prompts.map((prompt, index) => <li key={prompt} className="grid grid-cols-[2rem_1fr_auto] gap-3 py-4 first:pt-0 last:pb-0"><span className="text-xs font-label text-signal">0{index + 1}</span><p className="text-sm leading-6 text-carbon">{prompt}</p><Badge>Sin ejecutar</Badge></li>)}</ol>
          </Card>
          <Card padding="lg">
            <SectionTitle>Principio de medición</SectionTitle>
            <SparklesIcon className="text-signal" size={34} />
            <p className="mt-4 text-sm leading-6 text-graphite">Cada ejecución guarda motor, modalidad, contexto, respuesta, mención, prominencia, cita, competidores, exactitud y evidencia. Una sola respuesta no se interpreta como tendencia.</p>
            <Button className="mt-5" disabled>Ejecutar ronda</Button>
          </Card>
        </div>
      ) : null}

      {tab === "acciones" ? (
        <Card padding="lg">
          <SectionTitle>Cola priorizada</SectionTitle>
          <DataTable><DataTableHeader><DataTableRow><DataTableHead>Problema / acción</DataTableHead><DataTableHead>Impacto</DataTableHead><DataTableHead>Esfuerzo</DataTableHead><DataTableHead>Responsable</DataTableHead><DataTableHead>Estado</DataTableHead></DataTableRow></DataTableHeader><DataTableBody>{actions.map((row) => <DataTableRow key={row[0]}>{row.map((cell, index) => <DataTableCell key={`${row[0]}-${cell}`} className={index === 0 ? "min-w-[280px] font-medium text-carbon" : "min-w-[130px]"}>{index === 1 ? <Badge variant={cell === "Crítico" ? "danger" : cell === "Alto" ? "warning" : "default"}>{cell}</Badge> : cell}</DataTableCell>)}</DataTableRow>)}</DataTableBody></DataTable>
        </Card>
      ) : null}

      {tab === "alertas" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card padding="lg" className="border-danger/25"><div className="flex gap-3"><AlertTriangleIcon className="mt-0.5 text-danger" /><div><Badge variant="danger">Crítica</Badge><h2 className="mt-3 font-label text-carbon">Search Console sin acceso</h2><p className="mt-2 text-sm leading-6 text-graphite">No se pueden verificar páginas válidas, excluidas, consultas ni posiciones de Blyndtek.</p></div></div></Card>
          <Card padding="lg" className="border-danger/25"><div className="flex gap-3"><AlertTriangleIcon className="mt-0.5 text-danger" /><div><Badge variant="danger">Crítica</Badge><h2 className="mt-3 font-label text-carbon">GA4 de Blyndtek no verificable</h2><p className="mt-2 text-sm leading-6 text-graphite">No existe evidencia accesible de sesiones, conversiones o referidos de IA del dominio.</p></div></div></Card>
          <Card padding="lg"><div className="flex gap-3"><GlobeIcon className="mt-0.5 text-warning" /><div><Badge variant="warning">Advertencia</Badge><h2 className="mt-3 font-label text-carbon">Bing Webmaster sin sesión</h2><p className="mt-2 text-sm leading-6 text-graphite">No se pueden enviar sitemap ni leer consultas y backlinks de Bing.</p></div></div></Card>
          <Card padding="lg"><div className="flex gap-3"><CheckCircleIcon className="mt-0.5 text-success" /><div><Badge variant="success">Correcto</Badge><h2 className="mt-3 font-label text-carbon">Base técnica pública sana</h2><p className="mt-2 text-sm leading-6 text-graphite">32 URLs verificadas sin status, canonical, H1, alt text o enlaces rotos detectados.</p></div></div></Card>
        </div>
      ) : null}
    </div>
  );
}
