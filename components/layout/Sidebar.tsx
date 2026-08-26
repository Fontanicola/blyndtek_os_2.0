"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { UserAvatar } from "@/components/ui";
import { EyeIcon, EyeOffIcon, LogoutIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";
import { navigationItems, navigationSections } from "@/lib/navigation";
import type { Usuario } from "@/types/auth";
import type { NavItem } from "@/types/navigation";
import type { PreferenciaNavegacion } from "@/types/navegacion";

type SidebarProps = {
  usuario: Usuario | null;
  isOpen?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  mobile?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

function filterItems(items: NavItem[], role: Usuario["rol"] | null): NavItem[] {
  if (!role) {
    return [];
  }

  return items
    .filter((item) => item.roles.includes(role))
    .map((item) => ({
      ...item,
      children: item.children ? filterItems(item.children, role) : undefined
    }))
    .filter((item) => !item.children || item.children.length > 0 || item.href);
}

function isActivePath(pathname: string, href?: string) {
  if (!href) {
    return false;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function isNavItemActive(pathname: string, item: NavItem) {
  if (!item.href) {
    return false;
  }

  if (item.exact) {
    return pathname === item.href;
  }

  return isActivePath(pathname, item.href);
}

function hasActiveItem(pathname: string, items: NavItem[]): boolean {
  return items.some((item) => isNavItemActive(pathname, item) || (item.children ? hasActiveItem(pathname, item.children) : false));
}

function MainModuleRow({ item, pathname, collapsed, mobile, onClose }: { item: NavItem; pathname: string; collapsed: boolean; mobile: boolean; onClose?: () => void }) {
  const active = isNavItemActive(pathname, item) || Boolean(item.children?.some((child) => isNavItemActive(pathname, child) || child.children?.some((nested) => isNavItemActive(pathname, nested))));
  const href = item.href ?? item.children?.find((child) => child.href)?.href;
  const content = <><span className={cn("shrink-0 transition-colors", active ? "text-signal" : "text-graphite group-hover:text-carbon", "[&_svg]:h-5 [&_svg]:w-5")}>{item.icon}</span>{collapsed ? null : <span className={cn("text-sm font-label", active ? "text-signal" : "text-graphite group-hover:text-carbon")}>{item.label}</span>}</>;
  const className = cn("group relative z-10 mx-2 flex items-center gap-3 rounded-component px-3 py-2 no-underline transition-colors duration-fast ease-fast", collapsed && "justify-center px-0", active ? "bg-white/80 text-carbon" : "hover:bg-white/70");
  if (href) return <Link href={href} onClick={mobile ? onClose : undefined} title={collapsed ? item.label : undefined} className={className}>{content}</Link>;
  return <div title={collapsed ? item.label : undefined} className={className}>{content}</div>;
}

function MainSectionRow({ label, icon, active, collapsed }: { label: string; icon: ReactNode; active: boolean; collapsed: boolean }) {
  return <div className={cn("group relative z-10 mx-2 flex items-center gap-3 rounded-component px-3 py-2 transition-colors duration-fast ease-fast", collapsed && "justify-center px-0", active ? "bg-white/80 text-carbon" : "hover:bg-white/70")} title={collapsed ? label : undefined}>
    <span className={cn("shrink-0 transition-colors", active ? "text-signal" : "text-graphite group-hover:text-carbon", "[&_svg]:h-5 [&_svg]:w-5")}>{icon}</span>
    {collapsed ? null : <span className={cn("text-sm font-label", active ? "text-signal" : "text-graphite group-hover:text-carbon")}>{label}</span>}
  </div>;
}

export function Sidebar({
  usuario,
  isOpen = false,
  onClose,
  collapsed = false,
  mobile = false,
  onMouseEnter,
  onMouseLeave
}: SidebarProps) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const supabase = createClient();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [focusPreference, setFocusPreference] = useState<PreferenciaNavegacion | null>(null);
  const visibleItems = useMemo(
    () => filterItems(navigationItems, usuario?.rol ?? null),
    [usuario?.rol]
  );
  const focusActive = focusPreference?.modo_foco_activo === true;
  const hiddenSections = useMemo(() => focusPreference?.secciones_ocultas ?? [], [focusPreference?.secciones_ocultas]);
  const topLevelItems = useMemo(
    () => visibleItems.filter((item) => item.section === "top-level" && !(focusActive && item.focusKey && hiddenSections.includes(item.focusKey))),
    [visibleItems, focusActive, hiddenSections]
  );
  const displayName = usuario?.nombre ?? "";
  const displayRole = usuario?.rol ?? "";

  useEffect(() => {
    let active = true;
    async function loadPreference() {
      try {
        const response = await fetch("/api/preferencias-navegacion", { cache: "no-store" });
        const payload = await response.json() as { data?: PreferenciaNavegacion };
        if (active && response.ok && payload.data) setFocusPreference(payload.data);
      } catch {
        // La navegación conserva su estado completo si la preferencia no está disponible.
      }
    }
    void loadPreference();
    return () => { active = false; };
  }, [usuario?.id]);

  async function toggleFocusMode() {
    if (!focusPreference) return;
    const nextActive = !focusPreference.modo_foco_activo;
    setFocusPreference({ ...focusPreference, modo_foco_activo: nextActive });
    const response = await fetch("/api/preferencias-navegacion", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modo_foco_activo: nextActive }) });
    if (!response.ok) setFocusPreference({ ...focusPreference });
  }

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
          "relative z-30 md:sticky md:top-0",
          mobile
            ? "fixed inset-y-0 left-0 z-50 transition-transform duration-normal ease-normal md:hidden"
            : "hidden md:flex",
          mobile && (isOpen ? "pointer-events-auto translate-x-0" : "pointer-events-none -translate-x-full")
        )}
        onMouseEnter={mobile ? undefined : onMouseEnter}
        onMouseLeave={mobile ? undefined : onMouseLeave}
      >
        <div className={cn("flex items-center border-b border-line-soft", collapsed ? "h-12 justify-center px-1" : "h-16 px-5")}>{collapsed ? (
          <div className="relative h-8 w-8 shrink-0">
            <Image
              src="/Favicon_Blyndtek.svg"
              alt="Blyndtek OS"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
              priority
            />
          </div>
        ) : (
          <Image
            src="/Logo_Blyndtek_plataforma_negro.svg"
            alt="Blyndtek OS"
            width={132}
            height={28}
            className="h-7 w-[132px] max-w-none shrink-0"
            priority
          />
        )}</div>

        <nav className="relative z-10 flex-1 overflow-y-auto py-2">
          {topLevelItems.length > 0 ? (
            <div className="space-y-1">
              {topLevelItems.map((item) => (
                <MainModuleRow key={item.href ?? item.label} item={item} pathname={pathname} collapsed={collapsed} mobile={mobile} onClose={onClose} />
              ))}
            </div>
          ) : null}

          {navigationSections.map((section, index) => {
            const sectionItems = visibleItems.filter((item) => item.section === section.key);

            if (sectionItems.length === 0 || (focusActive && hiddenSections.includes(section.key))) {
              return null;
            }

            return (
              <div key={section.key}>
                {!collapsed ? <div className={topLevelItems.length > 0 || index > 0 ? "pt-3" : "pt-1"} /> : null}
                <MainSectionRow
                  label={section.label}
                  icon={section.icon}
                  active={sectionItems.some((item) => hasActiveItem(pathname, [item]))}
                  collapsed={collapsed}
                />
              </div>
            );
          })}
        </nav>

        <div ref={menuRef} className={cn("relative border-t border-line-soft py-3", collapsed ? "px-2" : "px-3")}>
          <div className={cn("mb-2 flex items-center", collapsed ? "justify-center" : "justify-between gap-2")}>
            <button
              type="button"
              title={focusActive ? "Desactivar modo foco" : "Activar modo foco"}
              aria-label={focusActive ? "Desactivar modo foco" : "Activar modo foco"}
              onClick={() => void toggleFocusMode()}
              className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-graphite transition-colors duration-fast ease-fast hover:bg-white/70 hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/20"
            >
              {focusActive ? <EyeOffIcon size={17} /> : <EyeIcon size={17} />}
              {focusActive && hiddenSections.length > 0 ? <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-pill bg-signal px-1 text-[10px] font-label text-white">{hiddenSections.length}</span> : null}
            </button>
            {!collapsed && focusActive && hiddenSections.length > 0 ? <span className="text-xs text-graphite">{hiddenSections.length} ocultas</span> : null}
          </div>
          {collapsed ? (
            <Link href="/perfil" title={displayName || "Perfil"} className="flex justify-center rounded-md p-1.5 transition-colors duration-fast ease-fast hover:bg-white/70">
              <UserAvatar name={usuario?.nombre ?? null} fotoUrl={usuario?.foto_url ?? null} size="sm" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors duration-fast ease-fast hover:bg-white/70"
            >
              <UserAvatar name={usuario?.nombre ?? null} fotoUrl={usuario?.foto_url ?? null} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-label text-carbon">{displayName}</p>
                <p className="text-xs text-graphite">{displayRole}</p>
              </div>
            </button>
          )}

          {menuOpen ? (
            <div
              className={cn(
                "absolute bottom-full z-50 mb-2 overflow-hidden rounded-card border border-line-soft bg-white shadow-modal",
                collapsed ? "left-2 right-2" : "left-3 right-3"
              )}
            >
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
