"use client";

import { useState } from "react";
import { Button, Card, Input } from "@/components/ui";
import type { PublicRoadmapCredentials } from "@/types/roadmap-public";

type CredencialesGateProps = {
  slug: string;
};

function CredentialValue({ label, value }: { label: string; value: string | null }) {
  const copyValue = async () => {
    if (!value) {
      return;
    }

    await navigator.clipboard.writeText(value);
  };

  return (
    <div className="rounded-card border border-line-soft bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-label text-graphite">{label}</p>
          <p className="mt-1 break-words text-sm text-carbon">{value ?? "Sin dato"}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void copyValue()} disabled={!value}>
          Copiar
        </Button>
      </div>
    </div>
  );
}

export function CredencialesGate({ slug }: CredencialesGateProps) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credenciales, setCredenciales] = useState<PublicRoadmapCredentials | null>(null);

  async function verifyPin() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/roadmap/${slug}/credenciales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ pin })
      });

      const payload = (await response.json()) as { data?: PublicRoadmapCredentials | null; error?: string };

      if (!response.ok || response.status !== 200 || typeof payload.data === "undefined") {
        throw new Error(payload.error ?? "PIN incorrecto o no disponible");
      }

      setCredenciales(payload.data);
      setError(null);
    } catch (verifyError) {
      setCredenciales(null);
      setError(verifyError instanceof Error ? verifyError.message : "PIN incorrecto o no disponible");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Card padding="lg" className="space-y-3 border border-line-soft">
        <div className="space-y-1">
          <p className="text-xs font-label text-graphite">Acceso restringido</p>
          <h2 className="text-xl font-title text-carbon">Credenciales del cliente</h2>
        </div>
        <p className="text-sm text-graphite">
          Estas credenciales solo se revelan en el roadmap público si el cliente ingresa el PIN de acceso que definas.
        </p>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Ver credenciales de acceso
        </Button>
      </Card>
    );
  }

  return (
    <Card padding="lg" className="space-y-4 border border-line-soft">
      <div className="space-y-1">
        <p className="text-xs font-label text-graphite">Acceso restringido</p>
        <h2 className="text-xl font-title text-carbon">Credenciales del cliente</h2>
      </div>

      {!credenciales ? (
        <div className="space-y-3">
          <p className="text-sm text-graphite">
            Estas credenciales solo se revelan en el roadmap público si el cliente ingresa el PIN de acceso que definas.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              label="PIN de acceso"
              type="password"
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="1234"
              className="sm:max-w-[220px]"
            />
            <div className="flex items-end gap-2">
              <Button variant="primary" onClick={() => void verifyPin()} disabled={loading || pin.trim().length < 4}>
                {loading ? "Verificando..." : "Verificar"}
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
            </div>
          </div>

          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </div>
      ) : (
        <div className="space-y-3">
          <CredentialValue label="Usuario" value={credenciales.usuario} />
          <CredentialValue label="Contraseña" value={credenciales.contraseña} />
          <div className="rounded-card border border-line-soft bg-paper p-3">
            <p className="text-xs font-label text-graphite">Notas</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-carbon">{credenciales.notas ?? "Sin notas"}</p>
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Ocultar credenciales
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
