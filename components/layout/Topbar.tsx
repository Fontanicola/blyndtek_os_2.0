"use client";

import { MenuIcon } from "@/components/ui/icons";
import { getPageLabel } from "@/lib/navigation";

type TopbarProps = {
  onMenuToggle: () => void;
  currentPath: string;
};

export function Topbar({ onMenuToggle, currentPath }: TopbarProps) {
  const pageLabel = getPageLabel(currentPath);

  return (
    <header className="sticky top-0 z-30 flex h-8 items-center border-b border-line-soft bg-white px-6 shadow-soft">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          aria-label="Abrir navegación"
          className="inline-flex h-7 w-7 items-center justify-center rounded-component text-carbon transition-colors duration-fast ease-fast hover:bg-paper md:hidden"
        >
          <MenuIcon />
        </button>
        <span className="hidden text-base font-title text-carbon md:block">{pageLabel}</span>
      </div>
    </header>
  );
}
