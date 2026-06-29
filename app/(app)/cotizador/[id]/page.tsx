"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AdjuntosUploader,
  AceptacionPanel,
  BeneficiosEditor,
  ChatContexto,
  ContextoResumen,
  CotizadorLayout,
  GeneradorIA,
  EntendimientoEditor,
  JustificacionPrecioEditor,
  MantenimientoDetalleEditor,
  ModulosEditor,
  PorQueNosotrosEditor,
  ParametrosForm,
  ResumenEjecutivo
} from "@/components/cotizador";
import { PropuestaPDF, RoadmapPDF } from "@/components/cotizador/preview";
import { Button, Card, Toast } from "@/components/ui";
import { useCotizaciones } from "@/lib/hooks/useCotizaciones";
import { generarFasesRoadmap } from "@/lib/utils/formatters";
import type {
  AdjuntoMetadata,
  Cotizacion,
  MensajeChat,
  ResultadoCascada
} from "@/types/cotizaciones";
import type { FaseRoadmap } from "@/types/roadmap";

type Step = 1 | 2 | 3 | 4 | 5;
type PreviewTab = "propuesta" | "roadmap";

type CotizacionDetailPageProps = {
  params: {
    id: string;
  };
};

const assistantPlaceholderMessage =
  "Perfecto, recibí tu descripción. Cuando hagas click en 'Generar módulos' en el paso siguiente, la IA va a leer todo este contexto para armar la propuesta.";

function createTimestamp() {
  return new Date().toISOString();
}

function distribuirModulosEnFases(
  fases: FaseRoadmap[],
  modulos: Array<{ nombre: string }>
): FaseRoadmap[] {
  if (fases.length === 0) {
    return [];
  }

  if (modulos.length === 0) {
    return fases;
  }

  return fases.map((fase, index) => {
    const start = Math.floor((index * modulos.length) / fases.length);
    const end = Math.floor(((index + 1) * modulos.length) / fases.length);
    const faseModulos = modulos
      .slice(start, Math.max(end, start + 1))
      .map((modulo) => modulo.nombre);

    return {
      ...fase,
      modulos: faseModulos
    };
  });
}

type ToastState = {
  message: string;
  type: "success" | "info" | "warning" | "error";
  visible: boolean;
};

export default function CotizacionDetailPage({ params }: CotizacionDetailPageProps) {
  const router = useRouter();
  const {
    cotizacionActual,
    loading,
    saving,
    error,
    fetchCotizacion,
    updateCotizacion,
    setCotizacionActual
  } = useCotizaciones();
  const [activeStep, setActiveStep] = useState<Step>(1);
  const [activePreviewTab, setActivePreviewTab] = useState<PreviewTab>("propuesta");
  const [generandoModulos, setGenerandoModulos] = useState(false);
  const [aceptando, setAceptando] = useState(false);
  const [resultadoAceptacion, setResultadoAceptacion] = useState<ResultadoCascada | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [procesandoAdjuntos, setProcesandoAdjuntos] = useState(false);
  const [toast, setToast] = useState<ToastState>({
    message: "",
    type: "success",
    visible: false
  });
  const assistantTimeoutRef = useRef<number | null>(null);
  const fechaGeneracion = useMemo(() => new Date(), []);

  useEffect(() => {
    void fetchCotizacion(params.id).then((data) => {
      if (!data) {
        router.replace("/cotizador");
      }
    });
  }, [fetchCotizacion, params.id, router]);

  useEffect(() => {
    if (cotizacionActual?.estado === "aceptada" && activeStep !== 5) {
      setActiveStep(5);
    }
  }, [activeStep, cotizacionActual?.estado]);

  useEffect(() => {
    return () => {
      if (assistantTimeoutRef.current) {
        window.clearTimeout(assistantTimeoutRef.current);
      }
    };
  }, []);

  const fasesRoadmap = useMemo(() => {
    if (!cotizacionActual) {
      return [];
    }

    const fases = generarFasesRoadmap(
      cotizacionActual.hitos,
      Math.max(cotizacionActual.plazo_semanas ?? 1, 1)
    );

    return distribuirModulosEnFases(fases, cotizacionActual.modulos);
  }, [cotizacionActual]);

  if (loading || !cotizacionActual) {
    return <div className="text-sm text-graphite">Cargando cotización...</div>;
  }

  function handleEnviarMensaje(mensaje: string) {
    const currentCotizacion = cotizacionActual;

    if (!currentCotizacion) {
      return;
    }

    const userMessage: MensajeChat = {
      rol: "user",
      contenido: mensaje,
      timestamp: createTimestamp()
    };
    const nextMessages = [...currentCotizacion.contexto_chat, userMessage];

    updateCotizacion(currentCotizacion.id, {
      contexto_chat: nextMessages
    });

    setChatLoading(true);

    assistantTimeoutRef.current = window.setTimeout(() => {
      const assistantMessage: MensajeChat = {
        rol: "assistant",
        contenido: assistantPlaceholderMessage,
        timestamp: createTimestamp()
      };

      updateCotizacion(currentCotizacion.id, {
        contexto_chat: [...nextMessages, assistantMessage]
      });
      setChatLoading(false);
    }, 220);
  }

  async function handleAdjuntoAgregado(adjunto: AdjuntoMetadata) {
    const currentCotizacion = cotizacionActual;

    if (!currentCotizacion) {
      return;
    }

    setProcesandoAdjuntos(true);

    try {
      updateCotizacion(currentCotizacion.id, {
        adjuntos: [...currentCotizacion.adjuntos, adjunto]
      });
    } finally {
      setProcesandoAdjuntos(false);
    }
  }

  function handleAdjuntoEliminado(nombre: string) {
    const currentCotizacion = cotizacionActual;

    if (!currentCotizacion) {
      return;
    }

    updateCotizacion(currentCotizacion.id, {
      adjuntos: currentCotizacion.adjuntos.filter((adjunto) => adjunto.nombre !== nombre)
    });
  }

  function showToast(message: string, type: ToastState["type"]) {
    setToast({
      message,
      type,
      visible: true
    });
  }

  async function handleGenerarModulos() {
    if (!cotizacionActual) {
      return;
    }

    setGenerandoModulos(true);

    try {
      const response = await fetch(`/api/cotizaciones/${cotizacionActual.id}/generar`, {
        method: "POST"
      });
      const payload = (await response.json()) as { data?: Cotizacion; error?: string };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo generar la propuesta.");
      }

      setCotizacionActual(payload.data);
      showToast("Propuesta generada correctamente.", "success");
    } catch (generateError) {
      showToast(
        generateError instanceof Error
          ? generateError.message
          : "No se pudo generar la propuesta.",
        "error"
      );
    } finally {
      setGenerandoModulos(false);
    }
  }

  async function handleAceptarCotizacion() {
    if (!cotizacionActual) {
      return;
    }

    setAceptando(true);

    try {
      const response = await fetch(`/api/cotizaciones/${cotizacionActual.id}/aceptar`, {
        method: "POST"
      });
      const payload = (await response.json()) as {
        data?: ResultadoCascada;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo aceptar la cotización.");
      }

      setResultadoAceptacion(payload.data);
      setCotizacionActual((current) =>
        current ? { ...current, estado: "aceptada", cliente_id: payload.data!.cliente_id } : current
      );
      setActiveStep(5);
      showToast("Cotización aceptada y cascada ejecutada.", "success");
    } catch (acceptError) {
      showToast(
        acceptError instanceof Error ? acceptError.message : "No se pudo aceptar la cotización.",
        "error"
      );
    } finally {
      setAceptando(false);
    }
  }

  const shouldShowContextHint =
    cotizacionActual.contexto_chat.length === 0 && cotizacionActual.adjuntos.length === 0;
  const hasModulos = cotizacionActual.modulos.length > 0;

  return (
    <CotizadorLayout
      cotizacion={cotizacionActual}
      saving={saving}
      activeStep={activeStep}
      onStepChange={(step) => setActiveStep(step)}
    >
      {error ? (
        <div className="mb-4 rounded-card border border-danger bg-danger-light px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {activeStep === 1 ? (
        <ParametrosForm
          cotizacion={cotizacionActual}
          onChange={(input) => updateCotizacion(cotizacionActual.id, input)}
          onNext={() => setActiveStep(2)}
        />
      ) : null}

      {activeStep === 2 ? (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
            <div className="space-y-6">
              <ChatContexto
                mensajes={cotizacionActual.contexto_chat}
                onEnviar={handleEnviarMensaje}
                loading={chatLoading}
              />

              <AdjuntosUploader
                adjuntos={cotizacionActual.adjuntos}
                onAdjuntoAgregado={(adjunto) => {
                  void handleAdjuntoAgregado(adjunto);
                }}
                onAdjuntoEliminado={handleAdjuntoEliminado}
                procesando={procesandoAdjuntos}
              />
            </div>

            <div className="space-y-6">
              <ContextoResumen cotizacion={cotizacionActual} />

              <Card padding="lg" className="space-y-3">
                <h3 className="text-base font-title text-carbon">¿Qué información ayuda a la IA?</h3>
                <ul className="space-y-2 text-sm text-graphite">
                  <li>Descripción funcional del sistema</li>
                  <li>Módulos o secciones que imaginás</li>
                  <li>Referencias a sistemas similares</li>
                  <li>Documentos de requerimientos</li>
                  <li>Presupuesto o restricciones técnicas</li>
                </ul>
              </Card>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => setActiveStep(1)}>
              ← Anterior
            </Button>

            <div className="flex flex-col items-end gap-2">
              {shouldShowContextHint ? (
                <p className="text-xs text-graphite">Podés agregar contexto ahora o saltearlo.</p>
              ) : null}
              <Button onClick={() => setActiveStep(3)}>Siguiente →</Button>
            </div>
          </div>
        </div>
      ) : null}

      {activeStep === 3 ? (
        <div className="space-y-6">
          <GeneradorIA
            cotizacion={cotizacionActual}
            loading={generandoModulos}
            onGenerate={() => {
              void handleGenerarModulos();
            }}
          />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)]">
            <div className="space-y-6">
              <EntendimientoEditor
                value={cotizacionActual.entendimiento}
                onChange={(value) => {
                  updateCotizacion(cotizacionActual.id, { entendimiento: value });
                }}
              />

              <BeneficiosEditor
                beneficios={cotizacionActual.beneficios}
                onChange={(beneficios) => {
                  updateCotizacion(cotizacionActual.id, { beneficios });
                }}
              />

              <ModulosEditor
                modulos={cotizacionActual.modulos}
                onChange={(modulos) => {
                  updateCotizacion(cotizacionActual.id, { modulos });
                }}
              />

              <JustificacionPrecioEditor
                value={cotizacionActual.justificacion_precio}
                onChange={(value) => {
                  updateCotizacion(cotizacionActual.id, { justificacion_precio: value });
                }}
              />

              <PorQueNosotrosEditor
                items={cotizacionActual.por_que_nosotros}
                onChange={(por_que_nosotros) => {
                  updateCotizacion(cotizacionActual.id, { por_que_nosotros });
                }}
              />

              <MantenimientoDetalleEditor
                value={cotizacionActual.mantenimiento_detalle}
                onChange={(mantenimiento_detalle) => {
                  updateCotizacion(cotizacionActual.id, { mantenimiento_detalle });
                }}
              />

              <ResumenEjecutivo
                value={cotizacionActual.resumen_ejecutivo}
                onChange={(value) => {
                  updateCotizacion(cotizacionActual.id, { resumen_ejecutivo: value });
                }}
              />
            </div>

            <Card padding="lg" className="space-y-3">
              <h3 className="text-base font-title text-carbon">Cómo funciona este paso</h3>
              <p className="text-sm text-graphite">
                Generá una propuesta base con la IA, ajustá los textos narrativos, afiná los
                módulos y dejá todo listo antes de pasar al preview.
              </p>
            </Card>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => setActiveStep(2)}>
              ← Anterior
            </Button>
            <Button onClick={() => setActiveStep(4)}>Ver preview →</Button>
          </div>
        </div>
      ) : null}

      {activeStep === 4 ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex rounded-pill bg-paper p-1">
              {[
                { key: "propuesta", label: "Propuesta" },
                { key: "roadmap", label: "Roadmap" }
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActivePreviewTab(tab.key as PreviewTab)}
                  className={[
                    "rounded-pill px-3 py-1.5 text-sm font-label transition-colors duration-fast ease-fast",
                    activePreviewTab === tab.key
                      ? "bg-white text-carbon shadow-soft"
                      : "text-graphite hover:text-carbon"
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <Button variant="secondary" onClick={() => window.print()}>
              Exportar PDF
            </Button>
          </div>

          {!hasModulos ? (
            <Card padding="lg">
              <p className="text-sm text-graphite">
                Generá los módulos en el paso anterior para ver la propuesta completa.
              </p>
            </Card>
          ) : null}

          <div className="mx-auto min-h-[1123px] w-full max-w-[794px] overflow-y-auto rounded-card bg-white shadow-modal">
            <div id="pdf-preview-container">
              {activePreviewTab === "propuesta" ? (
                <PropuestaPDF cotizacion={cotizacionActual} fechaGeneracion={fechaGeneracion} />
              ) : (
                <RoadmapPDF cotizacion={cotizacionActual} fases={fasesRoadmap} />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => setActiveStep(3)}>
              ← Anterior
            </Button>
            <Button onClick={() => setActiveStep(5)}>Siguiente →</Button>
          </div>
        </div>
      ) : null}

      {activeStep === 5 ? (
        <div className="space-y-6">
          <AceptacionPanel
            cotizacion={cotizacionActual}
            onAceptar={() => {
              void handleAceptarCotizacion();
            }}
            aceptando={aceptando}
            resultado={resultadoAceptacion}
          />

          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => setActiveStep(4)}>
              ← Anterior
            </Button>
            <div className="text-xs text-graphite">
              {cotizacionActual.estado === "aceptada"
                ? "La cascada ya se ejecutó."
                : "Revisá las validaciones antes de aceptar."}
            </div>
          </div>
        </div>
      ) : null}

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={() => setToast((current) => ({ ...current, visible: false }))}
      />
    </CotizadorLayout>
  );
}
