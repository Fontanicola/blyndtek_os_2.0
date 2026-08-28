"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, Download, Loader2, MessageCircle, RotateCcw } from "lucide-react";
import { MAPA_LEAK_LABELS, MAPA_PROCESS_OPTIONS, type MapaAnswers, type MapaResult } from "@/lib/marketing/mapa-fugas";

type ApiResponse = { ok?: boolean; token?: string; result?: MapaResult; pdf_url?: string; cta_url?: string; error?: string };
type ResultState = { result: MapaResult; pdfUrl: string; ctaUrl: string };

const fieldClass = "min-h-12 rounded-xl border border-line bg-white px-4 text-base outline-none transition focus:border-signal focus:ring-4 focus:ring-signal/10";

function numberFrom(form: FormData, key: string) {
  const value = Number(form.get(key));
  return Number.isFinite(value) ? value : 0;
}

function currency(value: number, code: "ARS" | "USD") {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: code, maximumFractionDigits: 0 }).format(value);
}

function StepHeader({ step, title, text }: { step: number; title: string; text: string }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal">Paso {step} de 2</p>
        <div className="flex gap-1.5" aria-label={`Paso ${step} de 2`}>
          {[1, 2].map((item) => <span key={item} className={`h-1.5 w-10 rounded-full ${item <= step ? "bg-signal" : "bg-line"}`} />)}
        </div>
      </div>
      <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-graphite">{text}</p>
    </div>
  );
}

function NumberField({ name, label, hint, defaultValue, min = 0, max = 100000 }: {
  name: string; label: string; hint: string; defaultValue: number; min?: number; max?: number;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <input name={name} type="number" required min={min} max={max} step="1" defaultValue={defaultValue} inputMode="numeric" className={fieldClass} />
      <span className="text-xs font-normal leading-5 text-graphite">{hint}</span>
    </label>
  );
}

export function MapaFugasForm() {
  const [stage, setStage] = useState<"identity" | "diagnostic" | "result">("identity");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState<ResultState | null>(null);

  async function post(payload: Record<string, unknown>) {
    const response = await fetch("/api/public/mapa-fugas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json() as ApiResponse;
    if (!response.ok || !data.ok) throw new Error(data.error || "No pudimos procesar el diagnóstico.");
    return data;
  }

  async function handleIdentity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const data = await post({
        action: "start",
        nombre: form.get("nombre"),
        email: form.get("email"),
        empresa: form.get("empresa"),
        consentimiento: form.get("consentimiento") === "on",
        honeypot: form.get("website"),
        landing_url: window.location.href
      });
      if (!data.token) throw new Error("No pudimos iniciar el diagnóstico.");
      setToken(data.token);
      setStage("diagnostic");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos iniciar el diagnóstico.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDiagnostic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const hourlyCostRaw = String(form.get("costo_hora") || "").trim();
    const answers: MapaAnswers = {
      proceso: String(form.get("proceso") || ""),
      casos_semanales: numberFrom(form, "casos_semanales"),
      minutos_recarga_por_caso: numberFrom(form, "minutos_recarga_por_caso"),
      minutos_seguimiento_por_caso: numberFrom(form, "minutos_seguimiento_por_caso"),
      correcciones_semanales: numberFrom(form, "correcciones_semanales"),
      minutos_por_correccion: numberFrom(form, "minutos_por_correccion"),
      personas_involucradas: numberFrom(form, "personas_involucradas"),
      costo_hora: hourlyCostRaw ? Number(hourlyCostRaw) : null,
      moneda: form.get("moneda") === "USD" ? "USD" : "ARS"
    };
    try {
      const data = await post({ action: "complete", token, respuestas: answers });
      if (!data.result || !data.pdf_url || !data.cta_url) throw new Error("No pudimos preparar el resultado.");
      setCompleted({ result: data.result, pdfUrl: data.pdf_url, ctaUrl: data.cta_url });
      setStage("result");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos calcular el resultado.");
    } finally {
      setLoading(false);
    }
  }

  if (stage === "result" && completed) {
    const { result, pdfUrl, ctaUrl } = completed;
    const maxHours = Math.max(...Object.values(result.horas_por_fuga), 1);
    const severityClass = result.severidad === "alta" ? "bg-[#FFE2E0] text-[#9B2C2C]" : result.severidad === "media" ? "bg-[#FFF0C7] text-[#855A00]" : "bg-[#DDF7E7] text-[#167345]";
    return (
      <div className="rounded-[28px] border border-white/10 bg-white p-6 text-carbon shadow-[0_32px_90px_rgba(2,8,23,0.35)] sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#DDF7E7] text-[#167345]"><CheckCircle2 className="h-6 w-6" aria-hidden="true" /></div>
          <span className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] ${severityClass}`}>Criticidad {result.severidad}</span>
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-signal">Resultado · {result.proceso}</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em]">Tu operación pierde aproximadamente {result.horas_mensuales} horas por mes.</h2>
        {result.costo_mensual !== null ? <p className="mt-3 text-base text-graphite">Equivale a cerca de <strong className="text-carbon">{currency(result.costo_mensual, result.moneda)} mensuales</strong> según el costo informado.</p> : null}

        <div className="mt-7 grid gap-4">
          {(Object.entries(result.horas_por_fuga) as Array<[keyof typeof result.horas_por_fuga, number]>).map(([key, hours]) => (
            <div key={key}>
              <div className="flex items-center justify-between gap-4 text-sm"><span className="font-medium">{MAPA_LEAK_LABELS[key]}</span><strong>{hours} h/mes</strong></div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-canvas"><div className="h-full rounded-full bg-signal" style={{ width: `${Math.max(4, (hours / maxHours) * 100)}%` }} /></div>
            </div>
          ))}
        </div>

        <div className="mt-7 rounded-2xl bg-canvas p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal">Dónde miraría primero</p>
          <h3 className="mt-2 text-lg font-semibold">{MAPA_LEAK_LABELS[result.fuga_principal]}</h3>
          <p className="mt-2 text-sm leading-6 text-graphite">{result.recomendacion}</p>
        </div>

        <div className="mt-7 rounded-2xl bg-[#0B1730] p-5 text-white">
          <h3 className="text-lg font-semibold">{result.cta_titulo}</h3>
          <p className="mt-2 text-sm leading-6 text-white/70">{result.cta_texto}</p>
          <a href={ctaUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#0B1730]">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />{result.cta_etiqueta}
          </a>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <a href={pdfUrl} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-signal px-5 py-3 text-sm font-semibold text-white transition hover:bg-signal-hover"><Download className="h-4 w-4" aria-hidden="true" />Descargar resultado en PDF</a>
          <button type="button" onClick={() => { setStage("identity"); setToken(""); setCompleted(null); setError(""); }} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line px-5 py-3 text-sm font-semibold transition hover:bg-canvas"><RotateCcw className="h-4 w-4" aria-hidden="true" />Mapear otro proceso</button>
        </div>
      </div>
    );
  }

  if (stage === "diagnostic") {
    return (
      <form onSubmit={handleDiagnostic} className="rounded-[28px] border border-white/10 bg-white p-6 text-carbon shadow-[0_32px_90px_rgba(2,8,23,0.35)] sm:p-8">
        <StepHeader step={2} title="Medí un proceso concreto" text="Usá promedios razonables. No hace falta que los datos sean perfectos para detectar la fuga dominante." />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium sm:col-span-2">Proceso a revisar
            <select name="proceso" required defaultValue="" className={fieldClass}><option value="" disabled>Elegí un proceso</option>{MAPA_PROCESS_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select>
          </label>
          <NumberField name="casos_semanales" label="Casos por semana" hint="Pedidos, presupuestos o gestiones que atraviesan el proceso." defaultValue={20} />
          <NumberField name="personas_involucradas" label="Personas involucradas" hint="Incluí a quienes cargan, revisan, aprueban o hacen seguimiento." defaultValue={3} min={1} max={10000} />
          <NumberField name="minutos_recarga_por_caso" label="Minutos de recarga por caso" hint="Tiempo total copiando el mismo dato entre WhatsApp, planillas o sistemas." defaultValue={5} max={1440} />
          <NumberField name="minutos_seguimiento_por_caso" label="Minutos de seguimiento por caso" hint="Mensajes, búsquedas o recordatorios para destrabar el avance." defaultValue={4} max={1440} />
          <NumberField name="correcciones_semanales" label="Correcciones por semana" hint="Cantidad de casos que deben revisarse o rehacerse." defaultValue={5} />
          <NumberField name="minutos_por_correccion" label="Minutos por corrección" hint="Tiempo promedio que demanda cada retrabajo." defaultValue={15} max={1440} />
          <label className="grid gap-2 text-sm font-medium">Costo estimado por hora <span className="font-normal text-graphite">(opcional)</span>
            <input name="costo_hora" type="number" min="0" max="10000000" step="1" inputMode="decimal" className={fieldClass} placeholder="Ej. 8000" />
          </label>
          <label className="grid gap-2 text-sm font-medium">Moneda
            <select name="moneda" defaultValue="ARS" className={fieldClass}><option value="ARS">ARS · pesos</option><option value="USD">USD · dólares</option></select>
          </label>
        </div>
        {error ? <p className="mt-4 rounded-xl bg-danger-light px-4 py-3 text-sm text-danger" role="alert">{error}</p> : null}
        <button type="submit" disabled={loading} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-signal px-5 py-3 text-sm font-semibold text-white transition hover:bg-signal-hover disabled:cursor-wait disabled:opacity-70">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}{loading ? "Calculando…" : "Ver mi resultado"}{!loading ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleIdentity} className="rounded-[28px] border border-white/10 bg-white p-6 text-carbon shadow-[0_32px_90px_rgba(2,8,23,0.35)] sm:p-8">
      <StepHeader step={1} title="Creá tu diagnóstico" text="Guardamos el resultado para que puedas descargarlo y retomarlo con Blyndtek si querés." />
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">Nombre<input name="nombre" required autoComplete="name" className={fieldClass} placeholder="Tu nombre" /></label>
        <label className="grid gap-2 text-sm font-medium">Email<input name="email" type="email" required autoComplete="email" className={fieldClass} placeholder="vos@empresa.com" /></label>
        <label className="grid gap-2 text-sm font-medium sm:col-span-2">Empresa <span className="font-normal text-graphite">(opcional)</span><input name="empresa" autoComplete="organization" className={fieldClass} placeholder="Nombre de tu empresa" /></label>
      </div>
      <div className="pointer-events-none absolute -left-[9999px]" aria-hidden="true"><label>Sitio web<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <label className="mt-5 flex items-start gap-3 text-xs leading-5 text-graphite"><input name="consentimiento" type="checkbox" required className="mt-1 h-4 w-4 rounded border-line accent-signal" /><span>Acepto recibir este diagnóstico y mensajes relacionados con su resultado.</span></label>
      {error ? <p className="mt-4 rounded-xl bg-danger-light px-4 py-3 text-sm text-danger" role="alert">{error}</p> : null}
      <button type="submit" disabled={loading} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-signal px-5 py-3 text-sm font-semibold text-white transition hover:bg-signal-hover disabled:cursor-wait disabled:opacity-70">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}{loading ? "Preparando…" : "Empezar el diagnóstico"}{!loading ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
      </button>
      <p className="mt-3 text-center text-xs text-graphite">7 minutos · resultado inmediato · PDF descargable</p>
    </form>
  );
}
