"use client";

import { MenuIcon } from "@/components/ui/icons";
import { Breadcrumb } from "@/components/layout/Breadcrumb";

type TopbarProps = {
  onMenuToggle: () => void;
  currentPath: string;
};

export function Topbar({ onMenuToggle, currentPath }: TopbarProps) {
  void currentPath;

  return (
    <header className="sticky top-0 z-30 flex min-h-12 items-center border-b border-line-soft bg-white px-4 md:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          aria-label="Abrir navegación"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-carbon transition-colors duration-fast ease-fast hover:bg-paper md:hidden"
        >
          <MenuIcon />
        </button>
        <Breadcrumb />
      </div>
    </header>
  );
}
