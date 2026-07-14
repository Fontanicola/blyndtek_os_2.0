"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { FaseProyecto } from "@/types/fases-proyecto";

type AiDevSectionProps = {
  fase: Pick<
    FaseProyecto,
    | "id"
    | "nombre"
    | "ai_dev_estado"
    | "ai_dev_error"
    | "pr_url"
    | "sql_pendiente"
    | "sql_ejecutado"
  >;
  githubRepo: string | null;
  onRefresh?: () => Promise<void> | void;
};

function SpinnerIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4 animate-spin">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.75" opacity="0.25" />
      <path d="M17 10a7 7 0 0 0-7-7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="M7.5 12.5 12.5 7.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M8.5 5.5H6.25A2.75 2.75 0 0 0 3.5 8.25v3.5A2.75 2.75 0 0 0 6.25 14.5h3.5A2.75 2.75 0 0 0 12.5 11.75V9.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.5 4.5H13.75A2.75 2.75 0 0 1 16.5 7.25v3.5A2.75 2.75 0 0 1 13.75 13.5h-3.5A2.75 2.75 0 0 1 7.5 10.75V8.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <rect x="6" y="6" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 13.5H4.25A1.25 1.25 0 0 1 3 12.25v-7A1.25 1.25 0 0 1 4.25 4h7A1.25 1.25 0 0 1 12.5 5.25V6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M4.5 13.5 8 10l2.25 2.25L15.5 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 7h2.5v2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M7.25 5.75 14.5 10l-7.25 4.25V5.75Z" fill="currentColor" />
    </svg>
  );
}

export function AiDevSection({ fase, githubRepo, onRefresh }: AiDevSectionProps) {
  const [loadingStart, setLoadingStart] = useState(false);
  const [loadingSql, setLoadingSql] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const state = fase.ai_dev_estado ?? "ninguno";
  const canStart = Boolean(githubRepo);
  const showSql = Boolean(fase.pr_url && fase.sql_pendiente && !fase.sql_ejecutado);

  async function refresh() {
    await onRefresh?.();
  }

  async function startAiDev() {
    if (!canStart) {
      return;
    }

    setLoadingStart(true);
    setError(null);

    try {
      const response = await fetch(`/api/fases/${fase.id}/ai-dev/iniciar`, {
        method: "POST"
      });
      const payload = (await response.json()) as { data?: { ejecucion_id: string }; error?: string };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo iniciar AI Dev.");
      }

      await refresh();
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "No se pudo iniciar AI Dev.");
    } finally {
      setLoadingStart(false);
    }
  }

  async function markSqlExecuted() {
    setLoadingSql(true);
    setError(null);

    try {
      const response = await fetch(`/api/fases/${fase.id}/ai-dev/sql-ejecutado`, {
        method: "POST"
      });
      const payload = (await response.json()) as { data?: { success: boolean }; error?: string };

      if (!response.ok || !payload.data?.success) {
        throw new Error(payload.error ?? "No se pudo marcar el SQL como ejecutado.");
      }

      await refresh();
    } catch (sqlError) {
      setError(sqlError instanceof Error ? sqlError.message : "No se pudo marcar el SQL como ejecutado.");
    } finally {
      setLoadingSql(false);
    }
  }

  async function copySql() {
    if (!fase.sql_pendiente) {
      return;
    }

    await navigator.clipboard.writeText(fase.sql_pendiente);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <Card padding="sm" className="space-y-1.5 border border-line-soft bg-paper/60">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-label uppercase tracking-[0.12em] text-graphite">AI Dev</p>

        {state === "planificando" || state === "codeando" ? (
          <span className="inline-flex items-center gap-2 rounded-pill border border-line-soft bg-white px-3 py-1 text-xs font-label text-carbon shadow-soft">
            <SpinnerIcon />
            {state === "planificando" ? "Planificando" : "Codeando"}
          </span>
        ) : state === "pr_abierto" ? null : (
          <span
            title={
              canStart
                ? "Iniciar AI Dev"
                : "Este proyecto no tiene un repositorio de GitHub configurado para AI Dev."
            }
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void startAiDev()}
              loading={loadingStart}
              disabled={!canStart || loadingStart}
              className="h-9 w-9 px-0"
            >
              <PlayIcon />
            </Button>
          </span>
        )}
      </div>

      {state === "pr_abierto" && fase.pr_url ? (
        <div className="space-y-2">
          <a
            href={fase.pr_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-label text-signal transition-colors duration-fast ease-fast hover:text-signal/80"
          >
            <LinkIcon />
            Ver PR →
          </a>

          {showSql ? (
            <div className="space-y-2 rounded-component border border-line-soft bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">SQL pendiente</p>
                <Button type="button" variant="ghost" size="sm" onClick={() => void copySql()}>
                  <CopyIcon />
                  {copied ? "Copiado" : "Copiar"}
                </Button>
              </div>
              <pre className="max-h-32 overflow-auto rounded-component bg-paper px-3 py-2 text-xs text-carbon">
                <code>{fase.sql_pendiente}</code>
              </pre>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => void markSqlExecuted()}
                loading={loadingSql}
                className="w-full justify-center"
              >
                <SparkIcon />
                Ya lo ejecuté
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {state === "fallido" && fase.ai_dev_error ? <p className="text-xs text-danger">{fase.ai_dev_error}</p> : null}
      {error ? <p className={cn("text-xs", state === "fallido" ? "text-danger" : "text-danger")}>{error}</p> : null}
    </Card>
  );
}
