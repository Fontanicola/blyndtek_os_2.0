"use client";

import { BellIcon, MenuIcon } from "@/components/icons";
import { getPageLabel } from "@/lib/navigation";
import type { Usuario } from "@/types/auth";

type TopbarProps = {
  usuario: Usuario | null;
  onMenuToggle: () => void;
  currentPath: string;
};

export function Topbar({ usuario, onMenuToggle, currentPath }: TopbarProps) {
  const initials = usuario ? usuario.nombre.slice(0, 2).toUpperCase() : "--";
  const pageLabel = getPageLabel(currentPath);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line-soft bg-white px-6 shadow-soft">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          aria-label="Abrir navegación"
          className="inline-flex h-9 w-9 items-center justify-center rounded-component text-carbon transition-colors duration-fast ease-fast hover:bg-paper md:hidden"
        >
          <MenuIcon />
        </button>
        <span className="hidden text-base font-title text-carbon md:block">{pageLabel}</span>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Notificaciones"
          className="inline-flex h-9 w-9 items-center justify-center rounded-component text-graphite transition-colors duration-fast ease-fast hover:bg-paper hover:text-carbon"
        >
          <BellIcon />
        </button>
        <div className="h-5 w-px bg-line-soft" />
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-signal-light text-xs font-label text-signal">
          {initials}
        </div>
      </div>
    </header>
  );
}
