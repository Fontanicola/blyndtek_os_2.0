"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Modal } from "@/components/ui";
import { DiagnosticoForm } from "@/components/diagnostico/DiagnosticoForm";
import { CopyIcon, DownloadIcon, LinkIcon } from "@/components/ui/icons";
import type { Diagnostico, DiagnosticoPublicPayload } from "@/types/diagnostico";
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

export function LeadDiagnosticoSection({ lead }: LeadDiagnosticoSectionProps) {
  const [diagnostico, setDiagnostico] = useState<Diagnostico | null>(null);
  const [payload, setPayload] = useState<DiagnosticoPublicPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [generatingInforme, setGeneratingInforme] = useState(false);
  const [copied, setCopied] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publicPath = diagnostico?.token_publico ? `/diagnostico/${diagnostico.token_publico}` : null;
  const informePath = diagnostico?.token_publico ? `/diagnostico/${diagnostico.token_publico}/informe` : null;
  const informePdfPath = diagnostico?.token_publico ? `/api/diagnostico/${diagnostico.token_publico}/informe/pdf` : null;
  const publicUrl = useMemo(() => {
    if (!publicPath || typeof window === "undefined") {
      return publicPath;
    }

    return `${window.location.origin}${publicPath}`;
  }, [publicPath]);
  const groupedRespuestas = payload ? groupRespuestas(payload) : [];

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
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "No se pudo generar el informe.");
    } finally {
      setGeneratingInforme(false);
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
                Ver informe público
              </Button>
            ) : null}
            {diagnostico.estado === "informe_generado" && informePdfPath ? (
              <a
                href={informePdfPath}
                className="inline-flex items-center justify-center gap-2 rounded-component border border-line bg-white px-3 py-1.5 text-sm font-label text-carbon transition-colors duration-fast hover:bg-paper"
              >
                <DownloadIcon size={15} aria-hidden="true" />
                Descargar PDF
              </a>
            ) : null}
            <Button
              size="sm"
              variant={diagnostico.estado === "informe_generado" ? "secondary" : "primary"}
              onClick={handleGenerateInforme}
              loading={generatingInforme}
            >
              {diagnostico.estado === "informe_generado" ? "Regenerar informe" : "Generar informe y propuesta"}
            </Button>
          </div>
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
