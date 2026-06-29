"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";
import type { CuentaServicio } from "@/types/cuentas";

type CuentaServicioCardProps = {
  cuenta: CuentaServicio;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

export function CuentaServicioCard({ cuenta, isAdmin, onEdit, onDelete }: CuentaServicioCardProps) {
  const [visible, setVisible] = useState(false);

  return (
    <Card padding="md" className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-label text-carbon">{cuenta.servicio}</p>
          <p className="mt-1 text-sm text-graphite">{cuenta.para_que ?? "Sin descripción"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Editar
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            Eliminar
          </Button>
        </div>
      </div>

      <div className="space-y-1 text-sm">
        <p className="text-graphite">
          Cuenta: <span className="text-carbon">{cuenta.cuenta_email ?? "Sin cuenta"}</span>
        </p>
        <div className="flex items-center gap-2">
          <span className="text-graphite">Notas de acceso:</span>
          {isAdmin ? (
            <button
              type="button"
              onClick={() => setVisible((current) => !current)}
              className="text-signal"
            >
              {visible ? "ocultar" : "ver"}
            </button>
          ) : null}
        </div>
        {isAdmin ? (
          <p className="rounded-card bg-paper px-3 py-2 text-sm text-carbon">
            {visible ? cuenta.notas_acceso ?? "Sin notas" : "••••••••••"}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
