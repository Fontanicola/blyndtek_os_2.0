"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Download, ExternalLink, Loader2 } from "lucide-react";

type MapaResponse = {
  ok?: boolean;
  google_sheets_url?: string;
  excel_download_url?: string;
  error?: string;
};

const PROCESS_OPTIONS = [
  "Pedidos",
  "Presupuestos",
  "Cobranzas",
  "Seguimiento comercial",
  "Compras y proveedores",
  "Otro proceso"
];

export function MapaFugasForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resource, setResource] = useState<MapaResponse | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const payload = {
      nombre: form.get("nombre"),
      email: form.get("email"),
      empresa: form.get("empresa"),
      instagram_usuario: form.get("instagram_usuario"),
      proceso: form.get("proceso"),
      consentimiento: form.get("consentimiento") === "on",
      honeypot: form.get("website"),
      landing_url: window.location.href
    };

    try {
      const response = await fetch("/api/public/mapa-fugas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = (await response.json()) as MapaResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "No pudimos preparar tu mapa.");
      }

      setResource(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos preparar tu mapa.");
    } finally {
      setLoading(false);
    }
  }

  if (resource?.google_sheets_url) {
    return (
      <div className="rounded-[28px] border border-white/10 bg-white p-6 text-carbon shadow-[0_32px_90px_rgba(2,8,23,0.35)] sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#DDF7E7] text-[#167345]">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="mt-5 text-2xl font-semibold tracking-[-0.04em]">Tu mapa está listo.</h2>
        <p className="mt-3 text-sm leading-6 text-graphite">
          Usá Google Sheets para completarlo online o descargá una copia en Excel. El original de Blyndtek no se modifica.
        </p>

        <div className="mt-6 grid gap-3">
          <a
            href={resource.google_sheets_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-signal px-5 py-3 text-sm font-semibold text-white transition hover:bg-signal-hover"
          >
            Crear mi copia en Google Sheets
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
          {resource.excel_download_url ? (
            <a
              href={resource.excel_download_url}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 py-3 text-sm font-semibold text-carbon transition hover:bg-canvas"
            >
              Descargar en Excel
              <Download className="h-4 w-4" aria-hidden="true" />
            </a>
          ) : null}
        </div>

        <div className="mt-6 rounded-2xl bg-canvas p-4 text-sm leading-6 text-graphite">
          Elegí un solo proceso y completá únicamente las celdas amarillas. Cuando termines, volvé al DM de Instagram y respondé <strong className="text-carbon">RESULTADO</strong>.
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[28px] border border-white/10 bg-white p-6 text-carbon shadow-[0_32px_90px_rgba(2,8,23,0.35)] sm:p-8"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal">Acceso al recurso</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Recibí tu copia editable</h2>
        <p className="mt-2 text-sm leading-6 text-graphite">Completá estos datos para guardar el origen del diagnóstico y entregarte el mapa.</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Nombre
          <input
            name="nombre"
            required
            autoComplete="name"
            className="min-h-12 rounded-xl border border-line bg-white px-4 text-base outline-none transition focus:border-signal focus:ring-4 focus:ring-signal/10"
            placeholder="Tu nombre"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="min-h-12 rounded-xl border border-line bg-white px-4 text-base outline-none transition focus:border-signal focus:ring-4 focus:ring-signal/10"
            placeholder="vos@empresa.com"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Empresa <span className="font-normal text-graphite">(opcional)</span>
          <input
            name="empresa"
            autoComplete="organization"
            className="min-h-12 rounded-xl border border-line bg-white px-4 text-base outline-none transition focus:border-signal focus:ring-4 focus:ring-signal/10"
            placeholder="Nombre de tu empresa"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Usuario de Instagram
          <input
            name="instagram_usuario"
            required
            autoComplete="off"
            className="min-h-12 rounded-xl border border-line bg-white px-4 text-base outline-none transition focus:border-signal focus:ring-4 focus:ring-signal/10"
            placeholder="@tuusuario"
          />
        </label>
      </div>

      <label className="mt-4 grid gap-2 text-sm font-medium">
        ¿Qué proceso querés revisar primero?
        <select
          name="proceso"
          required
          defaultValue=""
          className="min-h-12 rounded-xl border border-line bg-white px-4 text-base outline-none transition focus:border-signal focus:ring-4 focus:ring-signal/10"
        >
          <option value="" disabled>Elegí un proceso</option>
          {PROCESS_OPTIONS.map((option) => <option key={option}>{option}</option>)}
        </select>
      </label>

      <div className="pointer-events-none absolute -left-[9999px]" aria-hidden="true">
        <label>
          Sitio web
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label className="mt-5 flex items-start gap-3 text-xs leading-5 text-graphite">
        <input name="consentimiento" type="checkbox" required className="mt-1 h-4 w-4 rounded border-line accent-signal" />
        <span>Acepto recibir este recurso y mensajes relacionados con el resultado del diagnóstico por email o Instagram.</span>
      </label>

      {error ? (
        <p className="mt-4 rounded-xl bg-danger-light px-4 py-3 text-sm text-danger" role="alert">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-signal px-5 py-3 text-sm font-semibold text-white transition hover:bg-signal-hover disabled:cursor-wait disabled:opacity-70"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {loading ? "Preparando tu mapa…" : "Acceder al MAPA"}
        {!loading ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
      </button>
      <p className="mt-3 text-center text-xs text-graphite">Sin reunión, sin cotización y sin modificar tus sistemas.</p>
    </form>
  );
}
