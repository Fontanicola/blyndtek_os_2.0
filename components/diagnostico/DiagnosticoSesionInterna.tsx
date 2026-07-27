"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Modal, SavingIndicator } from "@/components/ui";
import { PlusIcon, TrashIcon } from "@/components/ui/icons";
import { calcularCostoMensualMetrica } from "@/lib/diagnostico/cuantitativo";
import type {
  DiagnosticoArea,
  DiagnosticoCuantitativoResumen,
  DiagnosticoMetrica,
  DiagnosticoMetricaTipo,
  DiagnosticoSesion,
  DiagnosticoSesionPayload
} from "@/types/diagnosticoCuantitativo";

type Props = { token: string };
type SaveState = "idle" | "saving" | "saved";

const metricTypeLabels: Record<DiagnosticoMetricaTipo, string> = {
  trabajo_manual: "Trabajo manual",
  doble_carga: "Doble carga",
  error_operativo: "Error operativo",
  licencia: "Licencia subutilizada",
  venta_perdida: "Venta perdida",
  otro: "Otro costo"
};

const today = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function newArea(): DiagnosticoArea {
  return {
    id: `temp-area-${Math.random().toString(36).slice(2)}`,
    diagnostico_id: "",
    nombre: "",
    responsable: null,
    volumen_mensual: 0,
    unidad_volumen: null,
    herramientas: [],
    proceso_actual: null,
    dependencia_critica: false,
    nivel_friccion: 3
  };
}

function newMetrica(): DiagnosticoMetrica {
  return {
    id: `temp-metrica-${Math.random().toString(36).slice(2)}`,
    diagnostico_id: "",
    area_id: null,
    tipo: "trabajo_manual",
    concepto: "",
    horas_mes: 0,
    costo_hora_usd: 0,
    cargas_mes: 0,
    minutos_por_carga: 0,
    errores_mes: 0,
    costo_por_error_usd: 0,
    licencias_mes_usd: 0,
    uso_pct: 0,
    oportunidades_mes: 0,
    ticket_promedio_usd: 0,
    tasa_cierre_pct: 0,
    costo_mensual_usd: 0,
    costo_anual_usd: 0,
    confianza: "media",
    notas: null
  };
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string | number; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-label text-graphite">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
      />
    </label>
  );
}

function TextField({ label, value, onChange, rows = 3, placeholder }: { label: string; value: string; onChange: (value: string) => void; rows?: number; placeholder?: string }) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-label text-graphite">{label}</span>
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-y rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
      />
    </label>
  );
}

export function DiagnosticoSesionInterna({ token }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [sesion, setSesion] = useState<DiagnosticoSesion>({
    id: "temp-sesion",
    diagnostico_id: "",
    fecha: today(),
    duracion_minutos: 90,
    decisor_nombre: null,
    decisor_cargo: null,
    notas: null,
    estado: "en_curso"
  });
  const [areas, setAreas] = useState<DiagnosticoArea[]>([]);
  const [metricas, setMetricas] = useState<DiagnosticoMetrica[]>([]);
  const [resumen, setResumen] = useState<DiagnosticoCuantitativoResumen | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/diagnostico/${token}/sesion`, { cache: "no-store" });
      const payload = (await response.json()) as { data?: DiagnosticoSesionPayload; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error ?? "No se pudo cargar la sesión.");
      if (payload.data.sesion) setSesion(payload.data.sesion);
      setAreas(payload.data.areas);
      setMetricas(payload.data.metricas);
      setResumen(payload.data.resumen);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la sesión.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, token]);

  const liveSummary = useMemo(() => {
    let monthly = 0;
    for (const metric of metricas) monthly += calcularCostoMensualMetrica(metric);
    return { monthly, annual: monthly * 12 };
  }, [metricas]);

  function updateArea(index: number, patch: Partial<DiagnosticoArea>) {
    setAreas((current) => current.map((area, itemIndex) => itemIndex === index ? { ...area, ...patch } : area));
  }

  function updateMetrica(index: number, patch: Partial<DiagnosticoMetrica>) {
    setMetricas((current) => current.map((metric, itemIndex) => itemIndex === index ? { ...metric, ...patch } : metric));
  }

  async function save(estado: "en_curso" | "completa" = sesion.estado) {
    setSaveState("saving");
    setError(null);
    try {
      const response = await fetch(`/api/diagnostico/${token}/sesion`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sesion: { ...sesion, estado }, areas, metricas })
      });
      const payload = (await response.json()) as { data?: DiagnosticoSesionPayload; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error ?? "No se pudo guardar la sesión.");
      if (payload.data.sesion) setSesion(payload.data.sesion);
      setAreas(payload.data.areas);
      setMetricas(payload.data.metricas);
      setResumen(payload.data.resumen);
      setSaveState("saved");
    } catch (saveError) {
      setSaveState("idle");
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar la sesión.");
    }
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Abrir sesión interna
      </Button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Sesión interna de diagnóstico" size="xl">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-component bg-signal-light p-4">
            <div>
              <p className="font-title text-carbon">Relevamiento operativo y cuantificación</p>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-graphite">
                Registrá hechos de la reunión, no conclusiones comerciales. Los costos se calculan automáticamente y luego alimentan el informe.
              </p>
            </div>
            <SavingIndicator estado={saveState} />
          </div>

          {error ? <div className="rounded-component border border-danger/20 bg-danger-light px-3 py-2 text-sm text-danger">{error}</div> : null}
          {loading ? <p className="text-sm text-graphite">Cargando sesión...</p> : null}

          <section className="space-y-3">
            <h3 className="text-lg font-title text-carbon">Datos de la sesión</h3>
            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Fecha" type="date" value={sesion.fecha} onChange={(value) => setSesion({ ...sesion, fecha: value })} />
              <Field label="Duración (minutos)" type="number" value={sesion.duracion_minutos ?? ""} onChange={(value) => setSesion({ ...sesion, duracion_minutos: Number(value) || null })} />
              <Field label="Decisor" value={sesion.decisor_nombre ?? ""} onChange={(value) => setSesion({ ...sesion, decisor_nombre: value })} placeholder="Nombre" />
              <Field label="Cargo" value={sesion.decisor_cargo ?? ""} onChange={(value) => setSesion({ ...sesion, decisor_cargo: value })} placeholder="Ej: dueño" />
            </div>
            <TextField label="Notas generales de la reunión" value={sesion.notas ?? ""} onChange={(value) => setSesion({ ...sesion, notas: value })} rows={4} placeholder="Hipótesis, contexto, objeciones, prioridades y decisiones del cliente..." />
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-title text-carbon">Mapa de áreas</h3>
                <p className="text-sm text-graphite">Una fila por área relevante de la empresa.</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setAreas((current) => [...current, newArea()])}><PlusIcon size={15} />Agregar área</Button>
            </div>
            <div className="space-y-3">
              {areas.map((area, index) => (
                <div key={area.id} className="rounded-component border border-line-soft bg-paper/50 p-4">
                  <div className="grid gap-3 md:grid-cols-4">
                    <Field label="Área" value={area.nombre} onChange={(value) => updateArea(index, { nombre: value })} placeholder="Ej: Administración" />
                    <Field label="Responsable" value={area.responsable ?? ""} onChange={(value) => updateArea(index, { responsable: value })} />
                    <Field label="Volumen mensual" type="number" value={area.volumen_mensual} onChange={(value) => updateArea(index, { volumen_mensual: Number(value) || 0 })} />
                    <Field label="Unidad" value={area.unidad_volumen ?? ""} onChange={(value) => updateArea(index, { unidad_volumen: value })} placeholder="pedidos, ventas..." />
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-[1fr_180px_180px_auto] md:items-end">
                    <Field label="Herramientas usadas" value={area.herramientas.join(", ")} onChange={(value) => updateArea(index, { herramientas: value.split(",").map((item) => item.trim()).filter(Boolean) })} placeholder="Excel, WhatsApp, papel" />
                    <label className="space-y-1"><span className="text-xs font-label text-graphite">Fricción 1-5</span><select value={area.nivel_friccion} onChange={(event) => updateArea(index, { nivel_friccion: Number(event.target.value) })} className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm"><option value="1">1 · Controlado</option><option value="2">2 · Bajo</option><option value="3">3 · Relevante</option><option value="4">4 · Alto</option><option value="5">5 · Crítico</option></select></label>
                    <label className="flex items-center gap-2 pb-2 text-sm font-label text-carbon"><input type="checkbox" checked={area.dependencia_critica} onChange={(event) => updateArea(index, { dependencia_critica: event.target.checked })} />Depende de una persona</label>
                    <Button size="sm" variant="ghost" onClick={() => setAreas((current) => current.filter((_, itemIndex) => itemIndex !== index))}><TrashIcon size={15} /></Button>
                  </div>
                  <div className="mt-3"><TextField label="Proceso actual" value={area.proceso_actual ?? ""} onChange={(value) => updateArea(index, { proceso_actual: value })} rows={2} placeholder="Cómo se ejecuta hoy, paso a paso..." /></div>
                </div>
              ))}
              {areas.length === 0 ? <p className="rounded-component border border-dashed border-line p-4 text-sm text-graphite">Agregá las áreas que quieras recorrer durante la sesión.</p> : null}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h3 className="text-lg font-title text-carbon">Métricas de pérdida</h3><p className="text-sm text-graphite">Elegí una fórmula y completá sólo los datos que estén confirmados.</p></div>
              <Button size="sm" variant="secondary" onClick={() => setMetricas((current) => [...current, newMetrica()])}><PlusIcon size={15} />Agregar métrica</Button>
            </div>
            <div className="space-y-3">
              {metricas.map((metric, index) => {
                const monthly = calcularCostoMensualMetrica(metric);
                return (
                  <div key={metric.id} className="rounded-component border border-line-soft bg-paper/50 p-4">
                    <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_auto] md:items-end">
                      <Field label="Concepto" value={metric.concepto} onChange={(value) => updateMetrica(index, { concepto: value })} placeholder="Ej: Carga manual de facturas" />
                      <label className="space-y-1"><span className="text-xs font-label text-graphite">Fórmula</span><select value={metric.tipo} onChange={(event) => updateMetrica(index, { tipo: event.target.value as DiagnosticoMetricaTipo })} className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm">{Object.entries(metricTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                      <label className="space-y-1"><span className="text-xs font-label text-graphite">Confianza</span><select value={metric.confianza} onChange={(event) => updateMetrica(index, { confianza: event.target.value as DiagnosticoMetrica["confianza"] })} className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm"><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select></label>
                      <Button size="sm" variant="ghost" onClick={() => setMetricas((current) => current.filter((_, itemIndex) => itemIndex !== index))}><TrashIcon size={15} /></Button>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-4">
                      {metric.tipo === "trabajo_manual" ? <><Field label="Horas / mes" type="number" value={metric.horas_mes} onChange={(value) => updateMetrica(index, { horas_mes: Number(value) || 0 })} /><Field label="Costo hora USD" type="number" value={metric.costo_hora_usd} onChange={(value) => updateMetrica(index, { costo_hora_usd: Number(value) || 0 })} /></> : null}
                      {metric.tipo === "doble_carga" ? <><Field label="Cargas / mes" type="number" value={metric.cargas_mes} onChange={(value) => updateMetrica(index, { cargas_mes: Number(value) || 0 })} /><Field label="Minutos / carga" type="number" value={metric.minutos_por_carga} onChange={(value) => updateMetrica(index, { minutos_por_carga: Number(value) || 0 })} /><Field label="Costo hora USD" type="number" value={metric.costo_hora_usd} onChange={(value) => updateMetrica(index, { costo_hora_usd: Number(value) || 0 })} /></> : null}
                      {metric.tipo === "error_operativo" ? <><Field label="Errores / mes" type="number" value={metric.errores_mes} onChange={(value) => updateMetrica(index, { errores_mes: Number(value) || 0 })} /><Field label="Costo por error USD" type="number" value={metric.costo_por_error_usd} onChange={(value) => updateMetrica(index, { costo_por_error_usd: Number(value) || 0 })} /></> : null}
                      {metric.tipo === "licencia" ? <><Field label="Licencias / mes USD" type="number" value={metric.licencias_mes_usd} onChange={(value) => updateMetrica(index, { licencias_mes_usd: Number(value) || 0 })} /><Field label="Uso real %" type="number" value={metric.uso_pct} onChange={(value) => updateMetrica(index, { uso_pct: Number(value) || 0 })} /></> : null}
                      {metric.tipo === "venta_perdida" ? <><Field label="Oportunidades / mes" type="number" value={metric.oportunidades_mes} onChange={(value) => updateMetrica(index, { oportunidades_mes: Number(value) || 0 })} /><Field label="Ticket promedio USD" type="number" value={metric.ticket_promedio_usd} onChange={(value) => updateMetrica(index, { ticket_promedio_usd: Number(value) || 0 })} /><Field label="Tasa de cierre %" type="number" value={metric.tasa_cierre_pct} onChange={(value) => updateMetrica(index, { tasa_cierre_pct: Number(value) || 0 })} /></> : null}
                      {metric.tipo === "otro" ? <Field label="Costo mensual USD" type="number" value={metric.costo_mensual_usd} onChange={(value) => updateMetrica(index, { costo_mensual_usd: Number(value) || 0 })} /> : null}
                    </div>
                    <div className="mt-3 flex flex-wrap items-end gap-3"><div className="min-w-48 flex-1"><TextField label="Nota / evidencia" value={metric.notas ?? ""} onChange={(value) => updateMetrica(index, { notas: value })} rows={2} placeholder="De dónde sale el dato y qué habría que validar..." /></div><div className="rounded-component bg-white px-4 py-3"><p className="text-xs font-label text-graphite">Pérdida estimada</p><p className="mt-1 text-lg font-title text-carbon">{formatUsd(monthly)} / mes</p><p className="text-xs text-graphite">{formatUsd(monthly * 12)} / año</p></div></div>
                  </div>
                );
              })}
              {metricas.length === 0 ? <p className="rounded-component border border-dashed border-line p-4 text-sm text-graphite">Agregá una métrica por cada pérdida que puedas cuantificar.</p> : null}
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-card border border-line-soft bg-paper p-4"><p className="text-xs font-label text-graphite">Pérdida mensual estimada</p><p className="mt-1 text-2xl font-title text-carbon">{formatUsd(liveSummary.monthly)}</p></div>
            <div className="rounded-card border border-line-soft bg-paper p-4"><p className="text-xs font-label text-graphite">Pérdida anual estimada</p><p className="mt-1 text-2xl font-title text-carbon">{formatUsd(liveSummary.annual)}</p></div>
            <div className="rounded-card border border-line-soft bg-paper p-4"><p className="text-xs font-label text-graphite">Datos registrados</p><p className="mt-1 text-2xl font-title text-carbon">{metricas.length}</p><Badge variant={resumen?.confianza === "alta" ? "success" : resumen?.confianza === "baja" ? "danger" : "warning"}>{resumen?.confianza ?? "media"} confianza</Badge></div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-4">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cerrar</Button>
            <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => void save("en_curso")} loading={saveState === "saving"}>Guardar sesión</Button><Button onClick={() => void save("completa")} loading={saveState === "saving"}>Marcar sesión completa</Button></div>
          </div>
        </div>
      </Modal>
    </>
  );
}
