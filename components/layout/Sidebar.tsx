"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogoutIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";
import { navigationItems, navigationSections } from "@/lib/navigation";
import type { Usuario } from "@/types/auth";

type SidebarProps = {
  usuario: Usuario | null;
  isOpen?: boolean;
  onClose?: () => void;
  mobile?: boolean;
};

export function Sidebar({
  usuario,
  isOpen = false,
  onClose,
  mobile = false
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const visibleItems = usuario
    ? navigationItems.filter((item) => item.roles.includes(usuario.rol))
    : [];
  const initials = usuario ? usuario.nombre.slice(0, 2).toUpperCase() : "--";
  const displayName = usuario?.nombre ?? "";
  const displayRole = usuario?.rol ?? "";

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
          "flex h-screen w-[220px] flex-col bg-canvas",
          "md:sticky md:top-0",
          mobile
            ? "fixed inset-y-0 left-0 z-50 transition-transform duration-normal ease-normal md:hidden"
            : "hidden md:flex",
          mobile && (isOpen ? "translate-x-0" : "-translate-x-full")
        )}
      >
        <div className="flex h-16 items-center border-b border-line-soft px-5">
          <Image
            src="/Logo_Blyndtek_plataforma_negro.svg"
            alt="Blyndtek OS"
            width={132}
            height={28}
            className="h-7 w-auto"
            priority
          />
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {navigationSections.map((section, index) => {
            const sectionItems = visibleItems.filter((item) => item.section === section.key);

            if (sectionItems.length === 0) {
              return null;
            }

            return (
              <div key={section.key}>
                {index > 0 ? (
                  <div className="px-5 pb-2 pt-5 text-xs font-label uppercase tracking-widest text-graphite">
                    {section.label}
                  </div>
                ) : (
                  <div className="pt-3" />
                )}

                <div className="space-y-1">
                  {sectionItems.map((item) => {
                    const isActive = pathname === item.href;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={mobile ? onClose : undefined}
                        className={cn(
                          "group mx-2 flex items-center gap-3 rounded-component px-3 py-2 no-underline transition-colors duration-fast ease-fast",
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
                        <span
                          className={cn(
                            "text-sm font-label transition-colors duration-fast ease-fast",
                            isActive ? "text-carbon" : "text-graphite group-hover:text-carbon"
                          )}
                        >
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="flex h-16 items-center gap-3 border-t border-line-soft px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-label text-signal">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-label text-carbon">{displayName}</p>
            <p className="text-xs text-graphite">{displayRole}</p>
          </div>
          <button
            type="button"
            aria-label="Cerrar sesión"
            onClick={handleLogout}
            disabled={!usuario}
            className="inline-flex h-9 w-9 items-center justify-center rounded-component text-graphite transition-colors duration-fast ease-fast hover:bg-white/70 hover:text-carbon disabled:cursor-not-allowed disabled:opacity-40"
          >
            <LogoutIcon />
          </button>
        </div>
      </aside>
    </>
  );
}
