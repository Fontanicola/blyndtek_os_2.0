"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
  EmptyState,
  Modal,
} from "@/components/ui";
import {
  ArrowRightIcon,
  BrainIcon,
  GlobeIcon,
  ImageIcon,
  InboxIcon,
  PhoneIcon,
  SparklesIcon,
} from "@/components/ui/icons";
import { chartTheme } from "@/lib/charts/chartTheme";
import { cn } from "@/lib/cn";
import type { MetaPeriod } from "@/types/meta";
import type { MarketingHubOverview } from "@/types/marketingHub";

type Mode = "web" | "leads" | "instagram" | "whatsapp";
type Lead = MarketingHubOverview["leads"][number];
type InstagramMedia = MarketingHubOverview["instagram"]["media"][number];

const integer = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });
const stageLabels: Record<string, string> = {
  por_contactar: "Por contactar",
  contactado: "Contactado",
  seguimiento: "Seguimiento",
  calificado: "Calificado",
  diagnostico_ofrecido: "Diagnóstico ofrecido",
  diagnostico_pagado: "Diagnóstico pagado",
  cotizacion: "Cotización",
  ganado: "Ganado",
  descartado: "Descartado",
};

function percent(value: number | null) {
  return value === null ? "—" : `${decimal.format(value * 100)}%`;
}
function dateLabel(value: string | number) {
  return new Date(String(value)).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
  });
}

function Metric({
  label,
  value,
  detail,
  tone = "blue",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "blue" | "violet" | "green" | "orange";
}) {
  const toneClass = {
    blue: "from-signal/10 to-white border-signal/15",
    violet: "from-violet-500/10 to-white border-violet-500/15",
    green: "from-success/10 to-white border-success/15",
    orange: "from-orange-500/10 to-white border-orange-500/15",
  }[tone];
  return (
    <Card padding="sm" className={cn("bg-gradient-to-br", toneClass)}>
      <p className="text-[11px] font-label uppercase tracking-[0.08em] text-graphite">
        {label}
      </p>
      <p className="mt-2 font-title text-2xl tabular-nums text-carbon">
        {value}
      </p>
      <p className="mt-1 line-clamp-1 text-xs text-graphite">{detail}</p>
    </Card>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-line-soft bg-white px-3 py-2 shadow-modal">
      <p className="mb-1 text-xs font-label text-carbon">{label}</p>
      {payload.map((item) => (
        <div
          key={item.name}
          className="flex min-w-[150px] items-center justify-between gap-4 text-xs"
        >
          <span className="flex items-center gap-2 text-graphite">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: item.color }}
            />
            {item.name}
          </span>
          <span className="font-label tabular-nums text-carbon">
            {integer.format(item.value || 0)}
          </span>
        </div>
      ))}
    </div>
  );
}

function LeadDetail({ lead }: { lead: Lead }) {
  const fields = [
    ["Empresa", lead.company],
    ["Email", lead.email || "—"],
    ["Teléfono", lead.phone || "—"],
    ["Etapa", stageLabels[lead.stage] || lead.stage],
    ["Fuente", lead.source || "Sin fuente"],
    ["Campaña", lead.campaign || "Sin campaña"],
    ["Landing", lead.landingUrl || "—"],
    ["CAPI", lead.capiStatus || "Pendiente"],
    ["Campaign ID", lead.campaignId || "—"],
    ["Ad set ID", lead.adsetId || "—"],
    ["Ad ID", lead.adId || "—"],
    ["Sesión web", lead.sessionId || "Sin vincular"],
  ];
  return (
    <div className="space-y-5">
      <div className="rounded-card bg-gradient-to-br from-signal-light to-white p-5">
        <Badge
          variant={
            lead.stage === "ganado"
              ? "success"
              : lead.stage === "descartado"
                ? "danger"
                : "default"
          }
        >
          {stageLabels[lead.stage] || lead.stage}
        </Badge>
        <p className="mt-3 font-title text-2xl text-carbon">{lead.name}</p>
        <p className="mt-1 text-sm text-graphite">
          Ingresó {new Date(lead.createdAt).toLocaleString("es-AR")}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <div
            key={label}
            className="rounded-md border border-line-soft bg-paper/60 p-3"
          >
            <p className="text-[11px] font-label uppercase tracking-wide text-graphite">
              {label}
            </p>
            <p className="mt-1 break-words text-sm text-carbon">{value}</p>
          </div>
        ))}
      </div>
      {lead.discardReason ? (
        <div className="rounded-md border border-danger/15 bg-danger-light p-4 text-sm text-danger">
          Motivo de descarte: {lead.discardReason}
        </div>
      ) : null}
    </div>
  );
}

function MediaDetail({ media }: { media: InstagramMedia }) {
  return (
    <div className="grid gap-5 md:grid-cols-[260px_1fr]">
      {media.thumbnailUrl ? (
        <img
          src={media.thumbnailUrl}
          alt="Publicación de Instagram"
          className="aspect-square w-full rounded-card object-cover"
        />
      ) : (
        <div className="flex aspect-square items-center justify-center rounded-card bg-paper text-graphite">
          <ImageIcon size={40} />
        </div>
      )}
      <div>
        <div className="grid grid-cols-2 gap-3">
          <Metric
            label="Alcance"
            value={integer.format(media.reach)}
            detail="Cuentas alcanzadas"
          />
          <Metric
            label="Interacción"
            value={percent(media.engagementRate)}
            detail={`${integer.format(media.interactions)} acciones`}
            tone="green"
          />
          <Metric
            label="Guardados"
            value={integer.format(media.saves)}
            detail="Señal de valor"
            tone="violet"
          />
          <Metric
            label="Compartidos"
            value={integer.format(media.shares)}
            detail={`${integer.format(media.views)} vistas`}
            tone="orange"
          />
        </div>
        <div className="mt-4 rounded-card border border-signal/15 bg-signal-light/70 p-4">
          <div className="flex gap-2">
            <SparklesIcon className="mt-0.5 shrink-0 text-signal" size={17} />
            <div>
              <p className="text-sm font-label text-carbon">
                Lectura de la pieza
              </p>
              <p className="mt-1 text-sm leading-6 text-graphite">
                {media.analysis}
              </p>
            </div>
          </div>
        </div>
        <p className="mt-4 line-clamp-5 text-sm leading-6 text-graphite">
          {media.caption || "Publicación sin texto"}
        </p>
        {media.permalink ? (
          <a
            href={media.permalink}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm font-label text-signal hover:underline"
          >
            Abrir publicación <ArrowRightIcon size={15} />
          </a>
        ) : null}
      </div>
    </div>
  );
}

export function MarketingHubPanel({
  mode,
  period,
}: {
  mode: Mode;
  period: MetaPeriod;
}) {
  const [data, setData] = useState<MarketingHubOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<InstagramMedia | null>(
    null,
  );
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [analyzingThread, setAnalyzingThread] = useState(false);

  useEffect(() => {
    let active = true;
    setError(null);
    void fetch(`/api/marketing/hub/overview?period=${period}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          data?: MarketingHubOverview;
          error?: string;
        };
        if (!response.ok || !payload.data)
          throw new Error(payload.error || "No se pudo cargar Adquisición.");
        if (active) setData(payload.data);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "No se pudo cargar Adquisición.",
          );
      });
    return () => {
      active = false;
    };
  }, [period]);

  const activeThread = useMemo(
    () =>
      data?.whatsapp.threads.find((thread) => thread.id === selectedThread) ||
      data?.whatsapp.threads[0] ||
      null,
    [data, selectedThread],
  );
  useEffect(() => {
    if (mode !== "whatsapp" || !activeThread?.unread) return;
    void fetch(
      `/api/marketing/whatsapp/conversations/${activeThread.id}/read`,
      { method: "PATCH" },
    ).then((response) => {
      if (!response.ok) return;
      setData((current) =>
        current
          ? {
              ...current,
              whatsapp: {
                ...current.whatsapp,
                unread: Math.max(
                  0,
                  current.whatsapp.unread - activeThread.unread,
                ),
                threads: current.whatsapp.threads.map((thread) =>
                  thread.id === activeThread.id
                    ? { ...thread, unread: 0 }
                    : thread,
                ),
              },
            }
          : current,
      );
    });
  }, [activeThread?.id, activeThread?.unread, mode]);
  async function analyzeThread() {
    if (!activeThread) return;
    setAnalyzingThread(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/marketing/whatsapp/conversations/${activeThread.id}/analyze`,
        { method: "POST" },
      );
      const payload = (await response.json()) as {
        data?: NonNullable<typeof activeThread.analysis>;
        error?: string;
      };
      if (!response.ok || !payload.data)
        throw new Error(
          payload.error || "No se pudo analizar la conversación.",
        );
      setData((current) =>
        current
          ? {
              ...current,
              whatsapp: {
                ...current.whatsapp,
                threads: current.whatsapp.threads.map((thread) =>
                  thread.id === activeThread.id
                    ? {
                        ...thread,
                        analysis: {
                          ...payload.data!,
                          analyzedAt: new Date().toISOString(),
                          lastMessageId:
                            thread.messages[thread.messages.length - 1]?.id ||
                            null,
                        },
                      }
                    : thread,
                ),
              },
            }
          : current,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo analizar la conversación.",
      );
    } finally {
      setAnalyzingThread(false);
    }
  }
  if (error)
    return (
      <Card className="border-danger/25 bg-danger-light text-sm text-danger">
        {error}
      </Card>
    );
  if (!data)
    return (
      <Card className="py-16 text-center text-sm text-graphite">
        Cruzando Web, Meta, CRM y canales...
      </Card>
    );

  if (mode === "web")
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Sesiones"
            value={integer.format(data.web.sessions)}
            detail={`${integer.format(data.web.visitors)} visitantes únicos`}
          />
          <Metric
            label="Engagement"
            value={percent(data.web.engagementRate)}
            detail={`${integer.format(data.web.engagedSessions)} sesiones comprometidas`}
            tone="green"
          />
          <Metric
            label="Intención"
            value={integer.format(data.web.formStarts)}
            detail={`${integer.format(data.web.whatsappClicks + data.web.calendlyClicks)} clics comerciales`}
            tone="violet"
          />
          <Metric
            label="Conversión web"
            value={percent(data.web.conversionRate)}
            detail={`${integer.format(data.web.leads)} leads vinculados`}
            tone="orange"
          />
        </div>
        {!data.web.sessions ? (
          <Card className="border-signal/15 bg-signal-light/50">
            <div className="flex items-start gap-3">
              <GlobeIcon className="mt-0.5 text-signal" size={18} />
              <div>
                <p className="text-sm font-label text-carbon">
                  El receptor está listo; esperando tráfico del sitio
                </p>
                <p className="mt-1 text-xs leading-5 text-graphite">
                  El tracker se activó en la web pública. Las visitas
                  posteriores al despliegue aparecerán acá; no se reconstruyen
                  visitas históricas.
                </p>
              </div>
            </div>
          </Card>
        ) : null}
        <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
          <Card padding="none" className="overflow-hidden">
            <div className="border-b border-line-soft px-5 py-4">
              <p className="font-title text-lg text-carbon">
                Tráfico e intención
              </p>
              <p className="mt-1 text-xs text-graphite">
                Evolución diaria del recorrido web.
              </p>
            </div>
            <div className="h-[310px] px-2 pb-3 pt-5">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.trend} margin={{ left: -16, right: 12 }}>
                  <defs>
                    <linearGradient
                      id="webSessions"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={chartTheme.colors.signal}
                        stopOpacity={0.24}
                      />
                      <stop
                        offset="95%"
                        stopColor={chartTheme.colors.signal}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke={chartTheme.grid.stroke}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={chartTheme.axis.tick}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={dateLabel}
                  />
                  <YAxis
                    tick={chartTheme.axis.tick}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="sessions"
                    name="Sesiones"
                    stroke={chartTheme.colors.signal}
                    fill="url(#webSessions)"
                    strokeWidth={2.5}
                  />
                  <Line
                    type="monotone"
                    dataKey="engagedSessions"
                    name="Comprometidas"
                    stroke={chartTheme.colors.success}
                    strokeWidth={2.2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="formStarts"
                    name="Formularios"
                    stroke="#7c3aed"
                    strokeWidth={2.2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card padding="none" className="overflow-hidden">
            <div className="border-b border-line-soft px-5 py-4">
              <p className="font-title text-lg text-carbon">
                Conversión diaria
              </p>
              <p className="mt-1 text-xs text-graphite">
                Acciones de mayor intención.
              </p>
            </div>
            <div className="h-[310px] px-2 pb-3 pt-5">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trend} margin={{ left: -24, right: 12 }}>
                  <CartesianGrid
                    stroke={chartTheme.grid.stroke}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={chartTheme.axis.tick}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={dateLabel}
                  />
                  <YAxis
                    tick={chartTheme.axis.tick}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={7}
                    wrapperStyle={{ fontSize: 11 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="whatsappClicks"
                    name="WhatsApp"
                    stroke="#ea580c"
                    strokeWidth={2.3}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="leads"
                    name="Leads"
                    stroke="#7c3aed"
                    strokeWidth={2.3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Card padding="none" className="overflow-hidden">
            <div className="border-b border-line-soft px-5 py-4">
              <p className="font-title text-lg text-carbon">
                Páginas de entrada
              </p>
            </div>
            {data.pages.length ? (
              <DataTable wrapperClassName="rounded-none border-0">
                <DataTableHeader>
                  <DataTableRow>
                    <DataTableHead>Página</DataTableHead>
                    <DataTableHead className="text-right">
                      Sesiones
                    </DataTableHead>
                    <DataTableHead className="text-right">CVR</DataTableHead>
                  </DataTableRow>
                </DataTableHeader>
                <DataTableBody>
                  {data.pages.map((row) => (
                    <DataTableRow key={row.path}>
                      <DataTableCell className="max-w-[300px] truncate font-label text-carbon">
                        {row.path}
                      </DataTableCell>
                      <DataTableCell className="text-right">
                        {row.sessions}
                      </DataTableCell>
                      <DataTableCell className="text-right">
                        {percent(row.conversionRate)}
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            ) : (
              <EmptyState
                icon={GlobeIcon}
                titulo="Esperando visitas"
                descripcion="Las páginas aparecerán con el tráfico nuevo."
              />
            )}
          </Card>
          <Card padding="none" className="overflow-hidden">
            <div className="border-b border-line-soft px-5 py-4">
              <p className="font-title text-lg text-carbon">
                Fuentes y campañas
              </p>
            </div>
            {data.sources.length ? (
              <DataTable wrapperClassName="rounded-none border-0">
                <DataTableHeader>
                  <DataTableRow>
                    <DataTableHead>Origen</DataTableHead>
                    <DataTableHead>Campaña</DataTableHead>
                    <DataTableHead className="text-right">
                      Sesiones
                    </DataTableHead>
                    <DataTableHead className="text-right">CVR</DataTableHead>
                  </DataTableRow>
                </DataTableHeader>
                <DataTableBody>
                  {data.sources.map((row) => (
                    <DataTableRow
                      key={`${row.source}-${row.medium}-${row.campaign}`}
                    >
                      <DataTableCell>
                        <p className="font-label text-carbon">{row.source}</p>
                        <p className="text-xs text-graphite">{row.medium}</p>
                      </DataTableCell>
                      <DataTableCell className="max-w-[220px] truncate">
                        {row.campaign}
                      </DataTableCell>
                      <DataTableCell className="text-right">
                        {row.sessions}
                      </DataTableCell>
                      <DataTableCell className="text-right">
                        {percent(row.conversionRate)}
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            ) : (
              <EmptyState
                icon={GlobeIcon}
                titulo="Sin fuentes todavía"
                descripcion="Las UTMs se agruparán automáticamente."
              />
            )}
          </Card>
        </div>
      </div>
    );

  if (mode === "leads")
    return (
      <>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric
              label="Leads atribuibles"
              value={integer.format(data.leads.length)}
              detail="Meta y sesiones web"
            />
            <Metric
              label="Calificados"
              value={integer.format(
                data.leads.filter((lead) =>
                  [
                    "calificado",
                    "diagnostico_ofrecido",
                    "diagnostico_pagado",
                    "cotizacion",
                    "ganado",
                  ].includes(lead.stage),
                ).length,
              )}
              detail="Con intención comercial"
              tone="green"
            />
            <Metric
              label="Con sesión web"
              value={integer.format(
                data.leads.filter((lead) => lead.sessionId).length,
              )}
              detail="Recorrido vinculable"
              tone="violet"
            />
          </div>
          {data.leads.length ? (
            <DataTable>
              <DataTableHeader>
                <DataTableRow>
                  <DataTableHead>Lead</DataTableHead>
                  <DataTableHead>Etapa</DataTableHead>
                  <DataTableHead>Origen</DataTableHead>
                  <DataTableHead className="text-right">Ingreso</DataTableHead>
                </DataTableRow>
              </DataTableHeader>
              <DataTableBody>
                {data.leads.map((lead) => (
                  <DataTableRow
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className="cursor-pointer"
                  >
                    <DataTableCell>
                      <p className="font-label text-carbon">{lead.name}</p>
                      <p className="text-xs text-graphite">{lead.company}</p>
                    </DataTableCell>
                    <DataTableCell>
                      <Badge
                        variant={
                          lead.stage === "ganado"
                            ? "success"
                            : lead.stage === "descartado"
                              ? "danger"
                              : "default"
                        }
                      >
                        {stageLabels[lead.stage] || lead.stage}
                      </Badge>
                    </DataTableCell>
                    <DataTableCell>
                      <p className="max-w-[280px] truncate text-carbon">
                        {lead.campaign || "Sin campaña"}
                      </p>
                      <p className="text-xs text-graphite">
                        {lead.source || "Directo"}
                      </p>
                    </DataTableCell>
                    <DataTableCell className="text-right">
                      <span className="text-xs text-graphite">
                        {new Date(lead.createdAt).toLocaleDateString("es-AR")}
                      </span>
                      <ArrowRightIcon
                        className="ml-3 inline text-signal"
                        size={15}
                      />
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          ) : (
            <Card className="py-12">
              <EmptyState
                icon={InboxIcon}
                titulo="Sin leads atribuibles"
                descripcion="Los leads de Meta y sesiones web aparecerán acá sin duplicarse."
              />
            </Card>
          )}
        </div>
        <Modal
          isOpen={Boolean(selectedLead)}
          onClose={() => setSelectedLead(null)}
          title="Detalle del lead"
          size="lg"
        >
          {selectedLead ? <LeadDetail lead={selectedLead} /> : null}
        </Modal>
      </>
    );

  if (mode === "instagram")
    return (
      <>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Metric
              label="Alcance"
              value={integer.format(data.instagram.reach)}
              detail="Cuentas alcanzadas"
            />
            <Metric
              label="Interacciones"
              value={integer.format(data.instagram.interactions)}
              detail={percent(data.instagram.engagementRate)}
              tone="green"
            />
            <Metric
              label="Vistas"
              value={integer.format(data.instagram.views)}
              detail="Reproducciones y vistas"
              tone="violet"
            />
            <Metric
              label="Guardados"
              value={integer.format(data.instagram.saves)}
              detail="Contenido de valor"
              tone="orange"
            />
            <Metric
              label="Compartidos"
              value={integer.format(data.instagram.shares)}
              detail="Distribución orgánica"
            />
          </div>
          {data.instagram.trend.length ? (
            <Card padding="none" className="overflow-hidden">
              <div className="border-b border-line-soft px-5 py-4">
                <p className="font-title text-lg text-carbon">
                  Rendimiento orgánico
                </p>
                <p className="mt-1 text-xs text-graphite">
                  Evolución de alcance, vistas e interacción.
                </p>
              </div>
              <div className="h-[280px] px-2 pb-3 pt-5">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={data.instagram.trend}
                    margin={{ left: -15, right: 14 }}
                  >
                    <CartesianGrid
                      stroke={chartTheme.grid.stroke}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={chartTheme.axis.tick}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={dateLabel}
                    />
                    <YAxis
                      tick={chartTheme.axis.tick}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      iconType="circle"
                      iconSize={7}
                      wrapperStyle={{ fontSize: 11 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="reach"
                      name="Alcance"
                      stroke={chartTheme.colors.signal}
                      strokeWidth={2.4}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="views"
                      name="Vistas"
                      stroke="#7c3aed"
                      strokeWidth={2.2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="interactions"
                      name="Interacciones"
                      stroke={chartTheme.colors.success}
                      strokeWidth={2.2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          ) : null}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="font-title text-lg text-carbon">
                Contenido y aprendizaje
              </p>
              <p className="text-xs text-graphite">
                Tocá una pieza para ver el análisis
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {data.instagram.media.map((media) => (
                <button
                  key={media.id}
                  type="button"
                  onClick={() => setSelectedMedia(media)}
                  className="overflow-hidden rounded-card border border-line-soft bg-white text-left transition-all hover:-translate-y-0.5 hover:border-signal/30 hover:shadow-card"
                >
                  <div className="relative">
                    {media.thumbnailUrl ? (
                      <img
                        src={media.thumbnailUrl}
                        alt="Preview de publicación"
                        className="aspect-square w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-square items-center justify-center bg-paper text-graphite">
                        <ImageIcon size={36} />
                      </div>
                    )}
                    <span className="absolute right-3 top-3 rounded-pill bg-carbon/75 px-2 py-1 text-[10px] font-label text-white">
                      {media.mediaType || "POST"}
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="line-clamp-2 text-sm font-label text-carbon">
                      {media.caption || "Publicación sin texto"}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-y-2 text-xs text-graphite">
                      <span>{integer.format(media.reach)} alcance</span>
                      <span>{percent(media.engagementRate)} interacción</span>
                      <span>{integer.format(media.saves)} guardados</span>
                      <span>{integer.format(media.shares)} compartidos</span>
                    </div>
                    <p className="mt-3 line-clamp-2 border-t border-line-soft pt-3 text-xs leading-5 text-signal">
                      {media.analysis}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <Modal
          isOpen={Boolean(selectedMedia)}
          onClose={() => setSelectedMedia(null)}
          title="Análisis de la publicación"
          size="xl"
        >
          {selectedMedia ? <MediaDetail media={selectedMedia} /> : null}
        </Modal>
      </>
    );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric
          label="Clics web"
          value={integer.format(data.whatsapp.clicks)}
          detail="Desde el sitio"
        />
        <Metric
          label="Conversaciones"
          value={integer.format(data.whatsapp.conversations)}
          detail="Cloud API"
          tone="violet"
        />
        <Metric
          label="Calificadas"
          value={integer.format(data.whatsapp.qualified)}
          detail="Marcadas en CRM"
          tone="green"
        />
        <Metric
          label="Sin leer"
          value={integer.format(data.whatsapp.unread)}
          detail="Requieren atención"
          tone="orange"
        />
        <Metric
          label="Primera respuesta"
          value={
            data.whatsapp.averageFirstResponseMinutes === null
              ? "—"
              : `${decimal.format(data.whatsapp.averageFirstResponseMinutes)} min`
          }
          detail="Promedio del período"
        />
      </div>
      {data.whatsapp.threads.length ? (
        <Card
          padding="none"
          className="grid min-h-[520px] overflow-hidden md:grid-cols-[300px_1fr]"
        >
          <div className="border-r border-line-soft">
            <div className="border-b border-line-soft px-4 py-3">
              <p className="font-title text-carbon">Conversaciones</p>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {data.whatsapp.threads.map((thread) => {
                const latest = thread.messages[thread.messages.length - 1];
                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => setSelectedThread(thread.id)}
                    className={cn(
                      "w-full border-b border-line-soft p-4 text-left transition-colors hover:bg-paper",
                      activeThread?.id === thread.id && "bg-signal-light/60",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-label text-carbon">
                        {thread.contactName || thread.waId}
                      </p>
                      <div className="flex items-center gap-1">
                        {thread.analysis ? (
                          <span
                            className={cn(
                              "rounded-pill px-2 py-0.5 text-[9px] font-label uppercase",
                              thread.analysis.urgency === "critica" ||
                                thread.analysis.urgency === "alta"
                                ? "bg-danger-light text-danger"
                                : thread.analysis.intent === "alto"
                                  ? "bg-success-light text-success"
                                  : "bg-paper text-graphite",
                            )}
                          >
                            {thread.analysis.intent}
                          </span>
                        ) : null}
                        {thread.unread ? (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-signal px-1 text-[10px] text-white">
                            {thread.unread}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-1 truncate text-xs text-graphite">
                      {latest?.text || "Mensaje sin texto"}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex min-h-0 flex-col bg-paper/40">
            {activeThread ? (
              <>
                <div className="flex items-center justify-between gap-3 border-b border-line-soft bg-white px-5 py-4">
                  <div>
                    <p className="font-label text-carbon">
                      {activeThread.contactName || activeThread.waId}
                    </p>
                    <p className="text-xs text-graphite">
                      {activeThread.leadId
                        ? "Vinculado con un lead del CRM"
                        : "Contacto todavía sin vincular"}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void analyzeThread()}
                    disabled={analyzingThread}
                  >
                    <BrainIcon size={15} />
                    {analyzingThread
                      ? "Analizando"
                      : activeThread.analysis
                        ? "Actualizar análisis"
                        : "Analizar"}
                  </Button>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto p-5">
                  {activeThread.analysis ? (
                    <div className="mb-5 rounded-card border border-signal/15 bg-gradient-to-br from-signal-light to-white p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <BrainIcon className="text-signal" size={17} />
                        <p className="font-label text-carbon">
                          Lectura comercial
                        </p>
                        <Badge
                          variant={
                            activeThread.analysis.intent === "alto" ||
                            activeThread.analysis.intent === "cliente"
                              ? "success"
                              : activeThread.analysis.intent === "spam"
                                ? "danger"
                                : "default"
                          }
                        >
                          Intención {activeThread.analysis.intent}
                        </Badge>
                        <Badge
                          variant={
                            activeThread.analysis.urgency === "alta" ||
                            activeThread.analysis.urgency === "critica"
                              ? "danger"
                              : "default"
                          }
                        >
                          Urgencia {activeThread.analysis.urgency}
                        </Badge>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-carbon">
                        {activeThread.analysis.summary}
                      </p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-md bg-white/80 p-3">
                          <p className="text-[10px] font-label uppercase tracking-wide text-graphite">
                            Próxima acción
                          </p>
                          <p className="mt-1 text-sm leading-5 text-carbon">
                            {activeThread.analysis.nextAction}
                          </p>
                        </div>
                        <div className="rounded-md bg-white/80 p-3">
                          <p className="text-[10px] font-label uppercase tracking-wide text-graphite">
                            Respuesta sugerida
                          </p>
                          <p className="mt-1 text-sm leading-5 text-carbon">
                            {activeThread.analysis.suggestedReply ||
                              "No corresponde responder."}
                          </p>
                        </div>
                      </div>
                      {activeThread.analysis.objections.length ||
                      activeThread.analysis.buyingSignals.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {activeThread.analysis.buyingSignals.map((signal) => (
                            <Badge key={signal} variant="success">
                              {signal}
                            </Badge>
                          ))}
                          {activeThread.analysis.objections.map((objection) => (
                            <Badge key={objection} variant="warning">
                              Objeción: {objection}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                      <p className="mt-3 text-[10px] text-graphite">
                        Confianza{" "}
                        {Math.round(activeThread.analysis.confidence * 100)}% ·
                        ajuste de score{" "}
                        {activeThread.analysis.scoreAdjustment >= 0 ? "+" : ""}
                        {activeThread.analysis.scoreAdjustment}
                      </p>
                    </div>
                  ) : null}
                  {activeThread.messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "max-w-[78%] rounded-card px-4 py-3 text-sm",
                        message.direction === "outbound"
                          ? "ml-auto bg-signal text-white"
                          : "bg-white text-carbon shadow-sm",
                      )}
                    >
                      <p>{message.text || `[${message.type || "mensaje"}]`}</p>
                      <p
                        className={cn(
                          "mt-1 text-[10px]",
                          message.direction === "outbound"
                            ? "text-white/70"
                            : "text-graphite",
                        )}
                      >
                        {new Date(message.timestamp).toLocaleString("es-AR")}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </Card>
      ) : (
        <Card className="py-12">
          <EmptyState
            icon={PhoneIcon}
            titulo="Bandeja preparada"
            descripcion="Los clics ya se miden. Las conversaciones aparecerán cuando el webhook de WhatsApp Cloud API reciba mensajes reales."
          />
        </Card>
      )}
    </div>
  );
}
