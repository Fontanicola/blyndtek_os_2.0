"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Input, Modal } from "@/components/ui";
import type { Cotizacion, ResultadoCascada } from "@/types/cotizaciones";
import { ResumenAceptacion } from "@/components/cotizador/ResumenAceptacion";

type AceptacionPanelProps = {
  cotizacion: Cotizacion;
  onAceptar: () => void | Promise<void>;
  aceptando: boolean;
  resultado: ResultadoCascada | null;
};

type ValidationItem = {
  label: string;
  ok: boolean;
};

function countFeatures(cotizacion: Cotizacion) {
  return cotizacion.modulos.reduce((total, modulo) => {
    return total + Math.max(modulo.features.length, 1);
  }, 0);
}

function getValidationItems(cotizacion: Cotizacion): ValidationItem[] {
  const hitos = cotizacion.hitos.length > 0 ? cotizacion.hitos : [];
  const totalPct = hitos.reduce((sum, hito) => sum + hito.pct, 0);

  return [
    { label: "Tiene empresa", ok: cotizacion.empresa.trim().length > 0 },
    { label: "Tiene precio", ok: (cotizacion.precio_total ?? 0) > 0 },
    { label: "Hitos suman 100%", ok: totalPct === 100 },
    { label: "Tiene módulos", ok: cotizacion.modulos.length > 0 }
  ];
}

function ChecklistIcon({ ok }: { ok: boolean }) {
  return (
    <span
      className={[
        "inline-flex h-5 w-5 items-center justify-center rounded-full text-xs",
        ok ? "bg-success-light text-success" : "bg-danger-light text-danger"
      ].join(" ")}
    >
      {ok ? "✓" : "×"}
    </span>
  );
}

export function AceptacionPanel({
  cotizacion,
  onAceptar,
  aceptando,
  resultado
}: AceptacionPanelProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [roadmapOrigin, setRoadmapOrigin] = useState("");

  useEffect(() => {
    setRoadmapOrigin(window.location.origin);
  }, []);

  const validations = useMemo(() => getValidationItems(cotizacion), [cotizacion]);
  const canAccept = validations.every((item) => item.ok);
  const isAccepted = cotizacion.estado === "aceptada" || Boolean(resultado);
  const acceptedResult = resultado;
  const roadmapUrl = acceptedResult
    ? `${roadmapOrigin}/roadmap/${acceptedResult.roadmap_token}`
    : "";

  if (isAccepted) {
    return (
      <div className="space-y-6">
        <Card
          padding="lg"
          className="space-y-4 border border-success/20 bg-success-light shadow-none"
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-success text-white">
              ✓
            </span>
            <div>
              <h3 className="text-base font-title text-carbon">Cotización aceptada ✓</h3>
              <p className="text-sm text-graphite">
                El proyecto, los cobros y el roadmap quedaron creados.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <a
              href={acceptedResult ? `/proyectos/${acceptedResult.proyecto_id}` : "/proyectos"}
              className="rounded-card border border-line-soft bg-white px-4 py-3 text-sm text-carbon transition-colors duration-fast ease-fast hover:bg-paper"
            >
              Ver proyecto
            </a>
            <a
              href="/clientes"
              className="rounded-card border border-line-soft bg-white px-4 py-3 text-sm text-carbon transition-colors duration-fast ease-fast hover:bg-paper"
            >
              Ver cliente
            </a>
            <a
              href="/finanzas"
              className="rounded-card border border-line-soft bg-white px-4 py-3 text-sm text-carbon transition-colors duration-fast ease-fast hover:bg-paper"
            >
              Ver cobros
            </a>
            <div className="rounded-card border border-line-soft bg-white px-4 py-3 text-sm text-graphite">
              Roadmap público listo
            </div>
          </div>
        </Card>

        <Card padding="lg" className="space-y-3">
          <h3 className="text-base font-title text-carbon">Link público del roadmap</h3>
          {acceptedResult ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input value={roadmapUrl} readOnly className="flex-1" />
              <Button
                variant="secondary"
                onClick={async () => {
                  await navigator.clipboard.writeText(roadmapUrl);
                }}
              >
                Copiar link
              </Button>
            </div>
          ) : (
            <p className="text-sm text-graphite">
              El link público se muestra en esta sesión cuando la aceptación devuelve el token.
            </p>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ResumenAceptacion cotizacion={cotizacion} />

      <Card padding="lg" className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-base font-title text-carbon">Validaciones previas</h3>
          <p className="text-sm text-graphite">
            La aceptación sólo se habilita cuando todo lo importante está listo.
          </p>
        </div>

        <div className="space-y-3">
          {validations.map((item) => (
            <div key={item.label} className="flex items-center gap-3 text-sm text-carbon">
              <ChecklistIcon ok={item.ok} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!canAccept || aceptando}
          loading={aceptando}
          onClick={() => setConfirmOpen(true)}
        >
          Aceptar cotización
        </Button>
      </Card>

      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirmar aceptación"
        size="md"
      >
        <div className="space-y-5">
          <p className="text-sm text-graphite">
            ¿Confirmás la aceptación? Esta acción crea el proyecto y los cobros, y no se puede
            deshacer fácilmente.
          </p>

          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              loading={aceptando}
              onClick={() => {
                setConfirmOpen(false);
                void Promise.resolve(onAceptar());
              }}
            >
              Crear proyecto
            </Button>
          </div>
        </div>
      </Modal>

      <Card padding="lg" className="space-y-3 bg-paper shadow-none">
        <div className="flex items-center gap-2">
          <Badge variant={canAccept ? "success" : "danger"}>
            {canAccept ? "Listo para aceptar" : "Faltan validaciones"}
          </Badge>
          <span className="text-xs text-graphite">Features previstas: {countFeatures(cotizacion)}</span>
        </div>
      </Card>
    </div>
  );
}
