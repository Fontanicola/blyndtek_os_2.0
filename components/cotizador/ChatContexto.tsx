"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card } from "@/components/ui";
import type { MensajeChat } from "@/types/cotizaciones";

type ChatContextoProps = {
  mensajes: MensajeChat[];
  onEnviar: (mensaje: string) => void;
  loading: boolean;
};

function ChatIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-8 w-8 text-graphite"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M8 10h8M8 14h5" strokeLinecap="round" />
      <path
        d="M7 19.5 3.5 21V7.5A2.5 2.5 0 0 1 6 5h12a2.5 2.5 0 0 1 2.5 2.5v9A2.5 2.5 0 0 1 18 19H7Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(timestamp));
}

export function ChatContexto({ mensajes, onEnviar, loading }: ChatContextoProps) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes]);

  function handleSubmit() {
    const trimmed = draft.trim();

    if (!trimmed || loading) {
      return;
    }

    onEnviar(trimmed);
    setDraft("");
  }

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="border-b border-line-soft px-5 py-4">
        <h2 className="text-base font-title text-carbon">Describí el sistema</h2>
        <p className="mt-1 text-sm text-graphite">
          Contanos qué hay que construir. Cuanto más detalle, mejor será la propuesta.
        </p>
      </div>

      <div className="max-h-[400px] space-y-4 overflow-y-auto px-5 py-5">
        {mensajes.length === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-center">
            <ChatIcon />
            <p className="text-sm text-graphite">Comenzá describiendo el sistema</p>
          </div>
        ) : (
          mensajes.map((mensaje, index) => {
            const isUser = mensaje.rol === "user";

            return (
              <div
                key={`${mensaje.timestamp}-${index}`}
                className={isUser ? "flex justify-end" : "flex justify-start"}
              >
                <div className="max-w-[85%]">
                  <div
                    className={[
                      "rounded-card px-4 py-2 text-sm shadow-soft",
                      isUser
                        ? "rounded-br-component bg-signal text-white"
                        : "rounded-bl-component bg-paper text-carbon"
                    ].join(" ")}
                  >
                    <p className="whitespace-pre-wrap">{mensaje.contenido}</p>
                  </div>
                  <p
                    className={[
                      "mt-1 text-xs text-graphite/60",
                      isUser ? "text-right" : "text-left"
                    ].join(" ")}
                  >
                    {formatTimestamp(mensaje.timestamp)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-line-soft px-5 py-4">
        <div className="flex items-end gap-3">
          <textarea
            rows={2}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Describí el sistema que necesitás cotizar..."
            disabled={loading}
            className="min-h-[72px] flex-1 resize-none rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon transition-all duration-fast ease-fast placeholder:text-graphite focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20 disabled:cursor-not-allowed disabled:bg-paper disabled:opacity-60"
          />
          <Button size="sm" onClick={handleSubmit} disabled={loading || draft.trim().length === 0}>
            Enviar
          </Button>
        </div>
      </div>
    </Card>
  );
}
