"use client";

import { Badge, Card } from "@/components/ui";
import type { Cliente } from "@/types/clientes";

type ClienteCardProps = {
  cliente: Cliente;
  onClick: () => void;
  selected?: boolean;
};

export function ClienteCard({ cliente, onClick, selected = false }: ClienteCardProps) {
  const variant =
    cliente.estado === "activo" ? "success" : cliente.estado === "pausado" ? "warning" : "default";

  return (
    <Card
      padding="md"
      onClick={onClick}
      className={selected ? "border-l-2 border-signal bg-signal-light" : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-label text-carbon">{cliente.empresa}</p>
          <p className="mt-1 text-sm text-graphite">
            {[cliente.pais, cliente.contacto_nombre].filter(Boolean).join(" · ") || "Sin datos"}
          </p>
        </div>

        <Badge variant={variant}>
          {cliente.estado === "activo" ? "Activo" : cliente.estado === "pausado" ? "Pausado" : "Inactivo"}
        </Badge>
      </div>
    </Card>
  );
}
