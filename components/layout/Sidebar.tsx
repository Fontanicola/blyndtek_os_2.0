"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { UserAvatar } from "@/components/ui";
import { ChevronDownIcon, LogoutIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";
import { navigationItems, navigationSections } from "@/lib/navigation";
import type { Usuario } from "@/types/auth";
import type { NavItem } from "@/types/navigation";

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

function NavigationRow({
  item,
  pathname,
  collapsed,
  mobile,
  onClose,
  level = 0,
  expanded,
  onToggleExpanded
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
  mobile: boolean;
  onClose?: () => void;
  level?: number;
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  const hasChildren = Boolean(item.children?.length);
  const isParentActive = hasChildren && item.children?.some((child) => isActivePath(pathname, child.href));
  const isActive = isActivePath(pathname, item.href) || isParentActive;

  if (hasChildren && !item.href) {
    return (
      <div>
        <button
          type="button"
          onClick={onToggleExpanded}
          title={collapsed ? item.label : undefined}
          aria-expanded={expanded}
          className={cn(
            "group mx-2 flex w-[calc(100%-1rem)] items-center gap-3 rounded-component px-3 py-2 text-left no-underline transition-colors duration-fast ease-fast",
            collapsed && "justify-center px-0",
            isParentActive ? "bg-white/80 text-carbon" : "hover:bg-white/70"
          )}
        >
          <span
            className={cn(
              "transition-colors duration-fast ease-fast",
              isParentActive ? "text-signal" : "text-graphite group-hover:text-carbon",
              item.iconClassName
            )}
          >
            {item.icon}
          </span>
          {collapsed ? null : (
            <span
              className={cn(
                "text-sm font-label transition-colors duration-fast ease-fast",
                isParentActive ? "text-carbon" : "text-graphite group-hover:text-carbon"
              )}
            >
              {item.label}
            </span>
          )}
          {!collapsed ? (
            <ChevronDownIcon
              className={cn(
                "ml-auto h-4 w-4 shrink-0 text-graphite transition-transform duration-fast ease-fast",
                expanded ? "rotate-180" : "rotate-0"
              )}
            />
          ) : null}
        </button>

        {expanded && !collapsed ? (
          <div className="mt-1 space-y-1">
            {item.children?.map((child) => (
              <NavigationRow
                key={child.href ?? child.label}
                item={child}
                pathname={pathname}
                collapsed={collapsed}
                mobile={mobile}
                onClose={onClose}
                level={level + 1}
                expanded={false}
                onToggleExpanded={() => undefined}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (!item.href) {
    return null;
  }

  return (
    <Link
      href={item.href}
      onClick={mobile ? onClose : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group mx-2 flex items-center gap-3 rounded-component px-3 py-2 no-underline transition-colors duration-fast ease-fast",
        collapsed && "justify-center px-0",
        level > 0 && !collapsed && "ml-4 w-[calc(100%-1.75rem)]",
        isActive ? "bg-white/80 text-carbon" : "hover:bg-white/70"
      )}
    >
      <span
        className={cn(
          "transition-colors duration-fast ease-fast",
          isActive ? "text-signal" : "text-graphite group-hover:text-carbon",
          item.iconClassName
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
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({
    "AI Hub": pathname.startsWith("/ai-hub")
  });
  const visibleItems = useMemo(
    () => filterItems(navigationItems, usuario?.rol ?? null),
    [usuario?.rol]
  );
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

  useEffect(() => {
    if (pathname.startsWith("/ai-hub")) {
      setExpandedParents((current) => ({ ...current, "AI Hub": true }));
    }
  }, [pathname]);

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
        onMouseEnter={mobile ? undefined : onMouseEnter}
        onMouseLeave={mobile ? undefined : onMouseLeave}
      >
        <div className={cn("flex h-16 items-center border-b border-line-soft", collapsed ? "justify-center px-2" : "px-5")}>{collapsed ? (
          <div className="relative h-9 w-9 shrink-0 overflow-hidden">
            <Image
              src="/Logo_Blyndtek_plataforma_negro.svg"
              alt="Blyndtek OS"
              fill
              sizes="36px"
              className="object-cover object-left"
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

        <nav className="flex-1 overflow-y-auto py-2">
          {topLevelItems.length > 0 ? (
            <div className="space-y-1">
              {topLevelItems.map((item) => (
                <NavigationRow
                  key={item.href ?? item.label}
                  item={item}
                  pathname={pathname}
                  collapsed={collapsed}
                  mobile={mobile}
                  onClose={onClose}
                  expanded={expandedParents[item.label] ?? false}
                  onToggleExpanded={() =>
                    setExpandedParents((current) => ({
                      ...current,
                      [item.label]: !current[item.label]
                    }))
                  }
                />
              ))}
            </div>
          ) : null}

          {navigationSections.map((section, index) => {
            const sectionItems = visibleItems.filter((item) => item.section === section.key);

            if (sectionItems.length === 0) {
              return null;
            }

            return (
              <div key={section.key}>
                {!collapsed ? <div className={topLevelItems.length > 0 || index > 0 ? "pt-3" : "pt-1"} /> : null}

                <div className="space-y-1">
                  {sectionItems.map((item) => (
                    <NavigationRow
                      key={item.href ?? item.label}
                      item={item}
                      pathname={pathname}
                      collapsed={collapsed}
                      mobile={mobile}
                      onClose={onClose}
                      expanded={expandedParents[item.label] ?? false}
                      onToggleExpanded={() =>
                        setExpandedParents((current) => ({
                          ...current,
                          [item.label]: !current[item.label]
                        }))
                      }
                    />
                  ))}
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
