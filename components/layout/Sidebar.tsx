"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogoutIcon } from "@/components/icons";
import { UserAvatar } from "@/components/ui";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";
import { navigationItems, navigationSections } from "@/lib/navigation";
import type { Usuario } from "@/types/auth";

type SidebarProps = {
  usuario: Usuario | null;
  isOpen?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  mobile?: boolean;
};

export function Sidebar({
  usuario,
  isOpen = false,
  onClose,
  collapsed = false,
  onToggleCollapse,
  mobile = false
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const visibleItems = usuario
    ? navigationItems.filter((item) => item.roles.includes(usuario.rol))
    : [];
  const topLevelItems = visibleItems.filter((item) => item.section === "top-level");
  const displayName = usuario?.nombre ?? "";
  const displayRole = usuario?.rol ?? "";

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current) {
        return;
      }

      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  async function handleLogout() {
    if (!usuario) {
      return;
    }

    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {mobile ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={onClose}
          className={cn(
            "fixed inset-0 z-40 bg-canvas/40 transition-opacity duration-fast ease-fast md:hidden",
            isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          )}
        />
      ) : null}

      <aside
        className={cn(
          "flex h-screen flex-col bg-canvas transition-[width] duration-normal ease-normal",
          collapsed ? "w-[76px]" : "w-[220px]",
          "md:sticky md:top-0",
          mobile
            ? "fixed inset-y-0 left-0 z-50 transition-transform duration-normal ease-normal md:hidden"
            : "hidden md:flex",
          mobile && (isOpen ? "translate-x-0" : "-translate-x-full")
        )}
      >
        <div className={cn("flex h-16 items-center border-b border-line-soft", collapsed ? "justify-center px-2" : "px-5")}>
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
            disabled={!onToggleCollapse}
            className={cn(
              "inline-flex items-center justify-center rounded-component transition-all duration-fast ease-fast hover:bg-white/70",
              !onToggleCollapse && "cursor-default hover:bg-transparent"
            )}
          >
            <Image
              src={collapsed ? "/Logo_Blyndtek_isotipo.svg" : "/Logo_Blyndtek_plataforma_negro.svg"}
              alt="Blyndtek OS"
              width={collapsed ? 38 : 132}
              height={28}
              className={cn(
                "h-7 w-auto transition-transform duration-normal ease-normal",
                collapsed ? "scale-100" : "scale-100"
              )}
              priority
            />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {topLevelItems.length > 0 ? (
            <div className="space-y-1">
              {topLevelItems.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={mobile ? onClose : undefined}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "group mx-2 flex items-center gap-3 rounded-component px-3 py-2 no-underline transition-colors duration-fast ease-fast",
                      collapsed && "justify-center px-0",
                      isActive ? "bg-white/80 text-carbon" : "hover:bg-white/70"
                    )}
                  >
                    <span
                      className={cn(
                        "transition-colors duration-fast ease-fast",
                        isActive ? "text-signal" : "text-graphite group-hover:text-carbon"
                      )}
                    >
                      {item.icon}
                    </span>
                    {collapsed ? null : (
                      <span
                        className={cn(
                          "text-sm font-label transition-colors duration-fast ease-fast",
                          isActive ? "text-carbon" : "text-graphite group-hover:text-carbon"
                        )}
                      >
                        {item.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ) : null}

          {navigationSections.map((section, index) => {
            const sectionItems = visibleItems.filter((item) => item.section === section.key);

            if (sectionItems.length === 0) {
              return null;
            }

            return (
              <div key={section.key}>
                {!collapsed ? (
                  (topLevelItems.length > 0 || index > 0) ? (
                    <div className="px-5 pb-2 pt-5 text-xs font-label uppercase tracking-widest text-graphite">
                      {section.label}
                    </div>
                  ) : (
                    <div className="pt-3" />
                  )
                ) : null}

                <div className="space-y-1">
                  {sectionItems.map((item) => {
                    const isActive = pathname === item.href;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={mobile ? onClose : undefined}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          "group mx-2 flex items-center gap-3 rounded-component px-3 py-2 no-underline transition-colors duration-fast ease-fast",
                          collapsed && "justify-center px-0",
                          isActive ? "bg-white/80 text-carbon" : "hover:bg-white/70"
                        )}
                      >
                        <span
                          className={cn(
                            "transition-colors duration-fast ease-fast",
                            isActive ? "text-signal" : "text-graphite group-hover:text-carbon"
                          )}
                        >
                          {item.icon}
                        </span>
                        {collapsed ? null : (
                          <span
                            className={cn(
                              "text-sm font-label transition-colors duration-fast ease-fast",
                              isActive ? "text-carbon" : "text-graphite group-hover:text-carbon"
                            )}
                          >
                            {item.label}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div ref={menuRef} className={cn("relative border-t border-line-soft py-3", collapsed ? "px-2" : "px-3")}>
          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            title={collapsed ? displayName : undefined}
            className={cn(
              "flex w-full items-center gap-3 rounded-component px-2 py-1.5 text-left transition-colors duration-fast ease-fast hover:bg-white/70",
              collapsed && "justify-center px-0"
            )}
          >
            <UserAvatar name={usuario?.nombre ?? null} fotoUrl={usuario?.foto_url ?? null} size="sm" />
            {collapsed ? null : (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-label text-carbon">{displayName}</p>
                <p className="text-xs text-graphite">{displayRole}</p>
              </div>
            )}
          </button>

          {menuOpen ? (
            <div className={cn(
              "absolute bottom-full z-50 mb-2 overflow-hidden rounded-card border border-line-soft bg-white shadow-modal",
              collapsed ? "left-2 right-2" : "left-3 right-3"
            )}>
              <div className="border-b border-line-soft px-3 py-2">
                <p className="truncate text-sm font-label text-carbon">{displayName}</p>
                <p className="text-xs text-graphite">{displayRole}</p>
              </div>
              <Link
                href="/perfil"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 text-sm text-carbon transition-colors duration-fast ease-fast hover:bg-paper"
              >
                Configuración de perfil
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  void handleLogout();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger transition-colors duration-fast ease-fast hover:bg-danger-light"
              >
                <LogoutIcon />
                <span>Cerrar sesión</span>
              </button>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}
