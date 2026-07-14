"use client";

import { Badge } from "@/components/ui";
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
    <button
      type="button"
      onClick={onClick}
      className={
        selected
          ? "block w-full rounded-component bg-signal-light px-3 py-3 text-left"
          : "block w-full border-b border-[#EAECF0] bg-white px-3 py-3 text-left transition-colors duration-fast ease-fast last:border-b-0 hover:bg-paper"
      }
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
    </button>
  );
}
