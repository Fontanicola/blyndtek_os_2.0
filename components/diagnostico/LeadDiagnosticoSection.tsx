"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Modal } from "@/components/ui";
import { DiagnosticoForm } from "@/components/diagnostico/DiagnosticoForm";
import { CopyIcon, DownloadIcon, LinkIcon, SparklesIcon } from "@/components/ui/icons";
import { DIAGNOSTICO_CONTEXTO_KEY, type Diagnostico, type DiagnosticoPublicPayload } from "@/types/diagnostico";
import type { Lead } from "@/types/leads";

type LeadDiagnosticoSectionProps = {
  lead: Lead;
};

type DiagnosticoResponse = {
  data?: Diagnostico | null;
  error?: string;
};

type PublicResponse = {
  data?: DiagnosticoPublicPayload;
  error?: string;
};

type InformeResponse = {
  data?: {
    diagnostico: Diagnostico;
    informe_url: string;
  };
  error?: string;
};

type PropuestaUpdateResponse = {
  data?: {
    diagnostico: Diagnostico;
    empresa: string;
  };
  error?: string;
};

type ChatResponse = {
  data?: {
    diagnostico: Diagnostico;
  };
  error?: string;
};

function groupRespuestas(payload: DiagnosticoPublicPayload) {
  return payload.preguntas.reduce<Array<{ categoria: string; respuestas: Array<{ pregunta: string; respuesta: string }> }>>(
    (groups, pregunta) => {
      const respuesta = payload.diagnostico.respuestas?.[pregunta.id]?.trim();

      if (!respuesta) {
        return groups;
      }

      const current = groups.find((group) => group.categoria === pregunta.categoria);

      if (current) {
        current.respuestas.push({ pregunta: pregunta.pregunta, respuesta });
        return groups;
      }

      return [...groups, { categoria: pregunta.categoria, respuestas: [{ pregunta: pregunta.pregunta, respuesta }] }];
    },
    []
  );
}

function getContextoAdicional(payload: DiagnosticoPublicPayload | null) {
  return payload?.diagnostico.respuestas?.[DIAGNOSTICO_CONTEXTO_KEY]?.trim() ?? "";
}

export function LeadDiagnosticoSection({ lead }: LeadDiagnosticoSectionProps) {
  const [diagnostico, setDiagnostico] = useState<Diagnostico | null>(null);
  const [payload, setPayload] = useState<DiagnosticoPublicPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [generatingInforme, setGeneratingInforme] = useState(false);
  const [savingPropuesta, setSavingPropuesta] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [empresaEditable, setEmpresaEditable] = useState(lead.empresa ?? "");
  const [precioDesarrolloEditable, setPrecioDesarrolloEditable] = useState("");
  const [precioMensualEditable, setPrecioMensualEditable] = useState("");
  const [chatMensaje, setChatMensaje] = useState("");
  const [copied, setCopied] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publicPath = diagnostico?.token_publico ? `/diagnostico/${diagnostico.token_publico}` : null;
  const informePath = diagnostico?.token_publico ? `/diagnostico/${diagnostico.token_publico}/informe` : null;
  const propuestaPath = diagnostico?.token_publico ? `/diagnostico/${diagnostico.token_publico}/propuesta` : null;
  const informePdfPath = diagnostico?.token_publico ? `/api/diagnostico/${diagnostico.token_publico}/informe/pdf` : null;
  const propuestaPdfPath = diagnostico?.token_publico
    ? `/api/diagnostico/${diagnostico.token_publico}/propuesta/pdf`
    : null;
  const publicUrl = useMemo(() => {
    if (!publicPath || typeof window === "undefined") {
      return publicPath;
    }

    return `${window.location.origin}${publicPath}`;
  }, [publicPath]);
  const groupedRespuestas = payload ? groupRespuestas(payload) : [];
  const contextoAdicional = getContextoAdicional(payload);

  useEffect(() => {
    setEmpresaEditable(lead.empresa ?? "");
  }, [lead.empresa]);

  useEffect(() => {
    setPrecioDesarrolloEditable(
      diagnostico?.precio_ideal_desarrollo == null ? "" : String(diagnostico.precio_ideal_desarrollo)
    );
    setPrecioMensualEditable(
      diagnostico?.precio_ideal_mensual == null ? "" : String(diagnostico.precio_ideal_mensual)
    );
  }, [diagnostico?.precio_ideal_desarrollo, diagnostico?.precio_ideal_mensual]);

  async function fetchDiagnostico() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/leads/${lead.id}/diagnostico`, { cache: "no-store" });
      const result = (await response.json()) as DiagnosticoResponse;

      if (!response.ok) {
        throw new Error(result.error ?? "No se pudo cargar el diagnóstico.");
      }

      setDiagnostico(result.data ?? null);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "No se pudo cargar el diagnóstico.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchPayload(token: string) {
    const response = await fetch(`/api/diagnostico/${token}`, { cache: "no-store" });
    const result = (await response.json()) as PublicResponse;

    if (!response.ok || !result.data) {
      throw new Error(result.error ?? "No se pudo cargar el formulario.");
    }

    setPayload(result.data);
    return result.data;
  }

  useEffect(() => {
    fetchDiagnostico();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  useEffect(() => {
    if (!diagnostico?.token_publico) {
      setPayload(null);
      return;
    }

    fetchPayload(diagnostico.token_publico).catch((payloadError) => {
      setError(payloadError instanceof Error ? payloadError.message : "No se pudieron cargar las respuestas.");
    });
  }, [diagnostico?.token_publico]);

  async function handleCreate() {
    setCreating(true);
    setError(null);

    try {
      const response = await fetch(`/api/leads/${lead.id}/diagnostico`, { method: "POST" });
      const result = (await response.json()) as DiagnosticoResponse;

      if (!response.ok || !result.data) {
        throw new Error(result.error ?? "No se pudo crear el diagnóstico.");
      }

      setDiagnostico(result.data);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo crear el diagnóstico.");
    } finally {
      setCreating(false);
    }
  }

  async function handleCopy() {
    if (!publicUrl) {
      return;
    }

    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function handleGenerateInforme() {
    if (!diagnostico?.token_publico) {
      return;
    }

    setGeneratingInforme(true);
    setError(null);

    try {
      const response = await fetch(`/api/diagnostico/${diagnostico.token_publico}/generar-informe`, {
        method: "POST"
      });
      const result = (await response.json()) as InformeResponse;

      if (!response.ok || !result.data) {
        throw new Error(result.error ?? "No se pudo generar el informe.");
      }

      setDiagnostico(result.data.diagnostico);
      await fetchPayload(diagnostico.token_publico);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "No se pudo generar el informe.");
    } finally {
      setGeneratingInforme(false);
    }
  }

  async function handleSavePropuesta() {
    if (!diagnostico?.token_publico) {
      return;
    }

    setSavingPropuesta(true);
    setError(null);

    try {
      const response = await fetch(`/api/diagnostico/${diagnostico.token_publico}/propuesta`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          empresa: empresaEditable,
          precio_ideal_desarrollo: Number(precioDesarrolloEditable || 0),
          precio_ideal_mensual: Number(precioMensualEditable || 0)
        })
      });
      const result = (await response.json()) as PropuestaUpdateResponse;

      if (!response.ok || !result.data) {
        throw new Error(result.error ?? "No se pudieron guardar los datos de propuesta.");
      }

      setDiagnostico(result.data.diagnostico);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudieron guardar los datos de propuesta.");
    } finally {
      setSavingPropuesta(false);
    }
  }

  async function handleChatModificacion() {
    if (!diagnostico?.token_publico || !chatMensaje.trim()) {
      return;
    }

    setChatLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/diagnostico/${diagnostico.token_publico}/informe/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ mensaje: chatMensaje })
      });
      const result = (await response.json()) as ChatResponse;

      if (!response.ok || !result.data) {
        throw new Error(result.error ?? "No se pudo modificar la propuesta con IA.");
      }

      setDiagnostico(result.data.diagnostico);
      setChatMensaje("");
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : "No se pudo modificar la propuesta con IA.");
    } finally {
      setChatLoading(false);
    }
  }

  function handleCompleted(nextDiagnostico: DiagnosticoPublicPayload["diagnostico"]) {
    setDiagnostico((current) => (current ? { ...current, ...nextDiagnostico } : current));
    setPayload((current) => (current ? { ...current, diagnostico: nextDiagnostico } : current));
    setAdminModalOpen(false);
  }

  return (
    <section className="space-y-4 rounded-card border border-line-soft bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-title text-carbon">Diagnóstico</h3>
          <p className="mt-1 text-sm text-graphite">
            Formulario para entender la operación antes de armar informe y propuesta.
          </p>
        </div>
        {diagnostico ? (
          <Badge variant={diagnostico.estado === "informe_generado" ? "signal" : diagnostico.estado === "respondido" ? "success" : "warning"}>
            {diagnostico.estado === "informe_generado"
              ? "Informe generado"
              : diagnostico.estado === "respondido"
                ? "Respondido"
                : "Pendiente"}
          </Badge>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-component border border-danger/20 bg-danger-light px-3 py-2 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-graphite">Cargando diagnóstico...</p>
      ) : !diagnostico ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-component bg-paper px-4 py-3">
          <p className="text-sm text-graphite">Todavía no hay diagnóstico creado para este lead.</p>
          <Button size="sm" onClick={handleCreate} loading={creating}>
            Crear diagnóstico
          </Button>
        </div>
      ) : diagnostico.estado === "pendiente" ? (
        <div className="space-y-3">
          <div className="rounded-component border border-line-soft bg-paper px-4 py-3">
            <p className="text-xs font-label text-graphite">Link público</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <a
                href={publicPath ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-w-0 items-center gap-2 text-sm font-label text-signal hover:text-signal-hover"
              >
                <LinkIcon size={16} aria-hidden="true" />
                <span className="truncate">{publicUrl}</span>
              </a>
              <Button size="sm" variant="secondary" onClick={handleCopy}>
                <CopyIcon size={15} aria-hidden="true" />
                {copied ? "Copiado" : "Copiar"}
              </Button>
            </div>
          </div>

          <Button size="sm" variant="secondary" onClick={() => setAdminModalOpen(true)}>
            Completar yo mismo
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedRespuestas.length > 0 ? (
            <div className="space-y-4">
              {contextoAdicional ? (
                <div className="space-y-2 rounded-component border border-signal/20 bg-signal-light p-4">
                  <p className="font-label text-signal">Contexto adicional para la IA</p>
                  <p className="text-sm leading-6 text-graphite">{contextoAdicional}</p>
                </div>
              ) : null}
              {groupedRespuestas.map((group) => (
                <div key={group.categoria} className="space-y-3 rounded-component border border-line-soft p-4">
                  <p className="font-label text-carbon">{group.categoria}</p>
                  {group.respuestas.map((respuesta) => (
                    <div key={respuesta.pregunta} className="space-y-1 border-t border-line-soft pt-3 first:border-t-0 first:pt-0">
                      <p className="text-sm font-label text-carbon">{respuesta.pregunta}</p>
                      <p className="text-sm leading-6 text-graphite">{respuesta.respuesta}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-graphite">El diagnóstico figura como respondido, pero no hay respuestas con contenido.</p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {diagnostico.estado === "informe_generado" && informePath ? (
              <Button size="sm" variant="secondary" onClick={() => window.open(informePath, "_blank")}>
                Ver diagnóstico
              </Button>
            ) : null}
            {diagnostico.estado === "informe_generado" && informePdfPath ? (
              <a
                href={informePdfPath}
                className="inline-flex items-center justify-center gap-2 rounded-component border border-line bg-white px-3 py-1.5 text-sm font-label text-carbon transition-colors duration-fast hover:bg-paper"
              >
                <DownloadIcon size={15} aria-hidden="true" />
                PDF diagnóstico
              </a>
            ) : null}
            {diagnostico.estado === "informe_generado" && propuestaPath ? (
              <Button size="sm" variant="secondary" onClick={() => window.open(propuestaPath, "_blank")}>
                Ver propuesta
              </Button>
            ) : null}
            {diagnostico.estado === "informe_generado" && propuestaPdfPath ? (
              <a
                href={propuestaPdfPath}
                className="inline-flex items-center justify-center gap-2 rounded-component border border-line bg-white px-3 py-1.5 text-sm font-label text-carbon transition-colors duration-fast hover:bg-paper"
              >
                <DownloadIcon size={15} aria-hidden="true" />
                PDF propuesta
              </a>
            ) : null}
            <Button
              size="sm"
              variant={diagnostico.estado === "informe_generado" ? "secondary" : "primary"}
              onClick={handleGenerateInforme}
              loading={generatingInforme}
            >
              {diagnostico.estado === "informe_generado" ? "Regenerar documentos" : "Generar documentos"}
            </Button>
          </div>

          {diagnostico.estado === "informe_generado" ? (
            <div className="space-y-4 rounded-card border border-line-soft bg-paper/50 p-4">
              <div>
                <p className="font-title text-carbon">Datos editables de la propuesta</p>
                <p className="mt-1 text-sm text-graphite">
                  Ajustá los datos comerciales sin regenerar todo el informe.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="space-y-1">
                  <span className="text-sm font-label text-carbon">Nombre del cliente</span>
                  <input
                    value={empresaEditable}
                    onChange={(event) => setEmpresaEditable(event.target.value)}
                    className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-label text-carbon">Precio desarrollo USD</span>
                  <input
                    value={precioDesarrolloEditable}
                    onChange={(event) => setPrecioDesarrolloEditable(event.target.value)}
                    type="number"
                    min="0"
                    className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-label text-carbon">Mensual USD</span>
                  <input
                    value={precioMensualEditable}
                    onChange={(event) => setPrecioMensualEditable(event.target.value)}
                    type="number"
                    min="0"
                    className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
                  />
                </label>
              </div>
              <Button size="sm" variant="secondary" onClick={handleSavePropuesta} loading={savingPropuesta}>
                Guardar datos comerciales
              </Button>

              <div className="space-y-2 border-t border-line-soft pt-4">
                <p className="font-title text-carbon">Pedir cambios con IA</p>
                <p className="text-sm text-graphite">
                  Pedile ajustes sobre el informe o la propuesta. Ej: “hacelo más orientado a stock”,
                  “sumá un módulo de reportes” o “bajá el alcance inicial”.
                </p>
                <textarea
                  value={chatMensaje}
                  onChange={(event) => setChatMensaje(event.target.value)}
                  rows={3}
                  className="w-full resize-y rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
                  placeholder="Escribí la modificación que querés pedirle a la IA..."
                />
                <Button size="sm" onClick={handleChatModificacion} loading={chatLoading} disabled={!chatMensaje.trim()}>
                  <SparklesIcon size={15} aria-hidden="true" />
                  Aplicar cambios con IA
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <Modal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        title="Completar diagnóstico"
        size="xl"
      >
        {payload ? (
          <DiagnosticoForm
            initialPayload={payload}
            saveUrl={`/api/leads/${lead.id}/diagnostico`}
            onCompleted={handleCompleted}
            compact
          />
        ) : (
          <p className="text-sm text-graphite">Cargando preguntas...</p>
        )}
      </Modal>
    </section>
  );
}
